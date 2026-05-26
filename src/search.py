import json
import os
import re
import numpy as np
import torch
from sentence_transformers import SentenceTransformer


# 兼容以下格式：
# 1) 【刑法-第十条】
# 2) 【刑法 第十条】
# 3) 【刑法第十条】
PRECISE_TAG_PATTERN = re.compile(
    r'^\s*(?P<law>.+?)(?:\s*[-－—–]\s*|\s+)?(?P<article>第[一二三四五六七八九十百千万零〇两\d]+条(?:之[一二三四五六七八九十百千万零〇两\d]+)?)\s*$'
)

# 案例号格式：
# 1) 【指导案例1号】
# 2) 【（2023）最高法民申1234号】
# 3) 【案例-张某故意杀人案】
CASE_NUMBER_PATTERN = re.compile(
    r'^(?:指导案例\s*)?(\d+)\s*号$|'
    r'^[（(](\d{4})[）)](.+?)号$|'
    r'^(案例-.+)$'
)


def parse_precise_tag(tag_text):
    """从标签文本中提取法律名和条号，或案例号，失败返回 None。"""
    if not tag_text:
        return None

    text = tag_text.strip()

    case_match = CASE_NUMBER_PATTERN.match(text)
    if case_match:
        if case_match.group(1):
            case_num = f"指导案例{case_match.group(1)}号"
            return {'case_number': case_num}
        elif case_match.group(2):
            case_num = f"（{case_match.group(2)}）{case_match.group(3)}号"
            return {'case_number': case_num}
        elif case_match.group(4):
            return {'case_number': case_match.group(4)}

    match = PRECISE_TAG_PATTERN.match(text)
    if not match:
        return None

    law_name = match.group('law').strip()
    article_num = match.group('article').strip()

    if not law_name or not article_num:
        return None

    return {
        'law_name': law_name,
        'article_number': article_num,
    }


# --- Lazy-loaded globals ---
_vector_store = None  # dict with keys: "embeddings", "documents", "metadata"
_embedding_model = None


def _load_vector_store(db_path):
    """Load embeddings.npy and metadata.json from db_path directory."""
    global _vector_store
    if _vector_store is not None:
        return _vector_store

    emb_path = os.path.join(db_path, "embeddings.npy")
    meta_path = os.path.join(db_path, "metadata.json")

    if not os.path.exists(emb_path) or not os.path.exists(meta_path):
        raise FileNotFoundError(
            f"Vector store not found at {db_path}.\n"
            f"Run: python scripts/build_vector_store.py"
        )

    print(f" [首次加载] 正在加载向量数据库: {db_path}")
    embeddings = np.load(emb_path)
    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    _vector_store = {
        "embeddings": embeddings.astype(np.float32),
        "documents": data["documents"],
        "metadata": data["metadata"],
    }
    print(f" 已加载 {len(_vector_store['documents'])} 条记录, 向量维度 {embeddings.shape[1]}")
    return _vector_store


def _load_embedding_model(model_name):
    """Load sentence-transformers model once."""
    global _embedding_model
    if _embedding_model is not None:
        return _embedding_model

    print(f" [首次加载] 正在加载 Embedding 模型: {model_name}")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"当前使用设备为: {device}")
    _embedding_model = SentenceTransformer(
        model_name,
        device=device,
        model_kwargs={"torch_dtype": torch.float16},
    )
    return _embedding_model


def _cosine_similarity(query_emb, corpus_emb):
    """Compute cosine similarity between query and all corpus vectors."""
    query_norm = query_emb / (np.linalg.norm(query_emb, axis=-1, keepdims=True) + 1e-10)
    corpus_norm = corpus_emb / (np.linalg.norm(corpus_emb, axis=1, keepdims=True) + 1e-10)
    return (corpus_norm @ query_norm.T).flatten()


def run_search(rewrite_text, db_path, collection_name, model_name, n_results):
    """Hybrid retrieval: precise tag lookup + vector similarity search.

    collection_name is ignored (kept for API compatibility).
    """
    store = _load_vector_store(db_path)
    model = _load_embedding_model(model_name)

    embeddings = store["embeddings"]
    documents = store["documents"]
    metadata = store["metadata"]

    print(f"\n搜索 大模型指令: {rewrite_text}")

    final_raw_docs = []
    seen_keys = set()
    # threshold: only return results with cosine similarity >= MIN_COSINE_SCORE
    # Scores can be negative for opposite meanings; 0.3 is a reasonable cutoff
    MIN_COSINE_SCORE = -1.0  # permissive — reranker will filter low-quality results

    # --- 1. 精准点名 (tag lookup in metadata) ---
    tags = re.findall(r'【(.*?)】', rewrite_text)

    for tag in tags:
        parsed = parse_precise_tag(tag)
        if not parsed:
            continue

        # 案例号精准检索
        if 'case_number' in parsed:
            case_num = parsed['case_number']
            for i, meta in enumerate(metadata):
                if meta.get('case_number') == case_num or meta.get('article_number') == case_num:
                    key = f"{meta.get('source', '')}_{meta['article_number']}"
                    if key not in seen_keys:
                        final_raw_docs.append({
                            "content": documents[i],
                            "metadata": {"source": meta["source"], "article_number": meta["article_number"],
                                         "doc_type": meta.get("doc_type", "law")},
                            "method": "精准点名",
                        })
                        seen_keys.add(key)
                        print(f" 精准命中案例：{meta.get('source', '')} {meta['article_number']}")
                        print(f" 内容预览: {documents[i][:60]}...")
            continue

        # 法律条文精准检索
        law_name_query = parsed.get('law_name') if parsed.get('law_name') != "未知" else None
        article_num = parsed.get('article_number')
        if not article_num:
            continue

        for i, meta in enumerate(metadata):
            if meta['article_number'] != article_num:
                continue

            db_source = meta.get('source', '')
            is_match = True
            if law_name_query:
                query_core = re.split(r'[_\\s\\u3000（(]', law_name_query)[0].strip()
                if query_core in db_source or db_source in query_core:
                    db_is_interp = any(kw in db_source for kw in ["解释", "规定"])
                    query_is_interp = any(kw in query_core for kw in ["解释", "规定"])
                    if db_is_interp != query_is_interp:
                        is_match = False
                else:
                    is_match = False

            if is_match:
                key = f"{db_source}_{meta['article_number']}"
                if key not in seen_keys:
                    final_raw_docs.append({
                        "content": documents[i],
                        "metadata": {"source": meta["source"], "article_number": meta["article_number"],
                                     "doc_type": meta.get("doc_type", "law")},
                        "method": "精准点名",
                    })
                    seen_keys.add(key)
                    print(f" 精准命中：{db_source} {meta['article_number']}")
                    print(f" 内容预览: {documents[i][:60]}...")

    # --- 2. 向量语义检索 ---
    pure_query = re.sub(r'【.*?】', '', rewrite_text).strip()
    if pure_query:
        print(f"[语义检索] 关键词: {pure_query}")
        query_emb = model.encode([pure_query], prompt_name="query", convert_to_numpy=True).astype(np.float32)
        scores = _cosine_similarity(query_emb, embeddings)

        # Get top-k indices
        top_k = min(n_results, len(scores))
        top_indices = np.argpartition(-scores, top_k - 1)[:top_k]
        top_indices = top_indices[np.argsort(-scores[top_indices])]

        for idx in top_indices:
            if scores[idx] < MIN_COSINE_SCORE:
                continue
            meta = metadata[idx]
            key = f"{meta['source']}_{meta['article_number']}"
            if key not in seen_keys:
                final_raw_docs.append({
                    "content": documents[idx],
                    "metadata": {"source": meta["source"], "article_number": meta["article_number"],
                                 "doc_type": meta.get("doc_type", "law")},
                    "method": "向量召回",
                })
                seen_keys.add(key)
    else:
        print(" [跳过向量搜索] 意图重写仅包含精准标签，无需执行模糊语义检索。")

    print(f"搜索完毕：共抓取 {len(final_raw_docs)} 条法条进入重排。")
    return final_raw_docs
