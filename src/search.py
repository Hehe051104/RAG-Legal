import json
import os
import re
from pathlib import Path
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


def _make_result(meta, content, method, score=None, doc_type=None):
    """构建统一的检索结果 dict，消除 6 处重复构造。"""
    result = {
        "content": content,
        "metadata": {
            "source": meta["source"],
            "article_number": meta["article_number"],
            "doc_type": doc_type or meta.get("doc_type", "law"),
            "case_number": meta.get("case_number", ""),
            "court": meta.get("court", ""),
            "date": meta.get("date", ""),
        },
        "method": method,
    }
    if score is not None:
        result["score"] = score
    return result


def _dedup_key(meta):
    """去重 key：source_article_number。"""
    return f"{meta.get('source', '')}_{meta.get('article_number', '')}"


def _vector_search(query_text, embeddings, documents, metadata, model, n_results, seen_keys, doc_type_filter=None, method_label="向量召回"):
    """向量语义搜索，可按doc_type过滤。

    Args:
        query_text: 搜索关键词
        embeddings: 向量矩阵
        documents: 文档列表
        metadata: 元数据列表
        model: embedding模型
        n_results: 返回数量
        seen_keys: 已见key集合（去重用）
        doc_type_filter: 过滤doc_type（None=不过滤，"case"=只搜案例，"law_interp"=只搜法律/解释）
        method_label: 标记检索方法
    """
    if not query_text:
        return []

    MIN_COSINE_SCORE = -1.0
    results = []

    query_emb = model.encode([query_text], prompt_name="query", convert_to_numpy=True).astype(np.float32)
    scores = _cosine_similarity(query_emb, embeddings)

    # 获取更多候选（过滤后可能不够）
    candidate_k = min(n_results * 3, len(scores)) if doc_type_filter else min(n_results, len(scores))
    top_indices = np.argpartition(-scores, candidate_k - 1)[:candidate_k]
    top_indices = top_indices[np.argsort(-scores[top_indices])]

    count = 0
    for idx in top_indices:
        if scores[idx] < MIN_COSINE_SCORE:
            continue
        if count >= n_results:
            break

        meta = metadata[idx]
        doc_type = meta.get("doc_type", "law")

        # 按类型过滤
        if doc_type_filter == "case" and doc_type != "case":
            continue
        if doc_type_filter == "law_interp" and doc_type not in ("law", "interpretation"):
            continue

        key = _dedup_key(meta)
        if key not in seen_keys:
            results.append(_make_result(meta, documents[idx], method_label, score=float(scores[idx])))
            seen_keys.add(key)
            count += 1

    return results


def _tag_lookup(tags, metadata, documents, seen_keys):
    """精准标签匹配。"""
    results = []

    for tag in tags:
        parsed = parse_precise_tag(tag)
        if not parsed:
            continue

        # 案例号精准检索
        if 'case_number' in parsed:
            case_num = parsed['case_number']
            for i, meta in enumerate(metadata):
                if meta.get('case_number') == case_num or meta.get('article_number') == case_num:
                    key = _dedup_key(meta)
                    if key not in seen_keys:
                        results.append(_make_result(meta, documents[i], "精准点名"))
                        seen_keys.add(key)
                        print(f" 精准命中案例：{meta.get('source', '')} {meta['article_number']}")
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
                key = _dedup_key(meta)
                if key not in seen_keys:
                    results.append(_make_result(meta, documents[i], "精准点名"))
                    seen_keys.add(key)
                    print(f" 精准命中：{db_source} {meta['article_number']}")

    return results


def run_search(rewrite_text, db_path, collection_name, model_name, n_results):
    """多路混合检索：标签精准匹配 + 法律向量搜索 + 案例向量搜索 + 关系扩展。

    保证返回结果中包含法律/解释和案例两类文档。
    """
    store = _load_vector_store(db_path)
    model = _load_embedding_model(model_name)

    embeddings = store["embeddings"]
    documents = store["documents"]
    metadata = store["metadata"]

    print(f"\n搜索指令: {rewrite_text}")

    final_raw_docs = []
    seen_keys = set()

    # --- 1. 精准标签匹配 ---
    tags = re.findall(r'【(.*?)】', rewrite_text)
    if tags:
        tag_results = _tag_lookup(tags, metadata, documents, seen_keys)
        final_raw_docs.extend(tag_results)
        print(f" 标签匹配：{len(tag_results)} 条")

    # --- 2. 提取搜索关键词 ---
    # 从结构化改写结果中提取
    law_keywords = ""
    case_keywords = ""

    law_kw_match = re.search(r'法律关键词[:：]\s*(.+?)(?:\|案例关键词|$)', rewrite_text)
    case_kw_match = re.search(r'案例关键词[:：]\s*(.+?)$', rewrite_text)

    if law_kw_match:
        law_keywords = law_kw_match.group(1).strip()
    if case_kw_match:
        case_keywords = case_kw_match.group(1).strip()

    # 去掉标签后的纯文本（回退用）
    pure_query = re.sub(r'【.*?】', '', rewrite_text).strip()
    # 去掉结构化标记
    pure_query = re.sub(r'领域[:：].*?\|', '', pure_query).strip()
    pure_query = re.sub(r'(法律|案例)关键词[:：].*?(?:\||$)', '', pure_query).strip()

    # --- 3. 路径A：法律/解释搜索 ---
    law_query = law_keywords or pure_query
    if law_query:
        law_results = _vector_search(
            law_query, embeddings, documents, metadata, model,
            n_results=max(n_results // 2, 3),
            seen_keys=seen_keys,
            doc_type_filter="law_interp",
            method_label="法律检索"
        )
        final_raw_docs.extend(law_results)
        print(f" 法律检索：{len(law_results)} 条")

    # --- 4. 路径B：案例搜索 ---
    case_query = case_keywords or pure_query
    if case_query:
        case_results = _vector_search(
            case_query, embeddings, documents, metadata, model,
            n_results=max(n_results // 2, 3),
            seen_keys=seen_keys,
            doc_type_filter="case",
            method_label="案例检索"
        )
        final_raw_docs.extend(case_results)
        print(f" 案例检索：{len(case_results)} 条")

    # --- 5. 如果没有结构化关键词，用统一搜索补充 ---
    if not law_keywords and not case_keywords and pure_query:
        # 通用搜索（不过滤类型）
        general_results = _vector_search(
            pure_query, embeddings, documents, metadata, model,
            n_results=n_results,
            seen_keys=seen_keys,
            doc_type_filter=None,
            method_label="向量召回"
        )
        final_raw_docs.extend(general_results)
        print(f" 通用搜索：{len(general_results)} 条")

    print(f"搜索完毕：共 {len(final_raw_docs)} 条进入重排。")

    # --- 6. 关系扩展 ---
    final_raw_docs = _expand_relations(final_raw_docs, store, seen_keys)

    return final_raw_docs


def _expand_relations(raw_docs, store, seen_keys, max_expand=3):
    """从命中结果的关联索引补充相关文档。

    如果命中了法律/解释，但没有案例，补充案例。
    如果命中了案例，但没有法律/解释，补充法律和解释。
    """
    ref_path = Path(__file__).resolve().parent.parent / "data" / "reverse_references.json"
    if not ref_path.exists():
        return raw_docs

    with open(ref_path, "r", encoding="utf-8") as f:
        reverse_refs = json.load(f)

    law_to_cases = reverse_refs.get("law_to_cases", {})
    interp_to_cases = reverse_refs.get("interp_to_cases", {})

    documents = store["documents"]
    metadata = store["metadata"]

    doc_types = set(d["metadata"].get("doc_type", "") for d in raw_docs)
    expanded = []

    # 法律/解释 → 案例
    if "case" not in doc_types:
        for doc in raw_docs:
            meta = doc["metadata"]
            if meta.get("doc_type") not in ("law", "interpretation"):
                continue

            key = f"{meta.get('source', '')}|{meta.get('article_number', '')}"
            case_numbers = law_to_cases.get(key, []) or interp_to_cases.get(key, [])

            for case_num in case_numbers[:2]:
                for i, m in enumerate(metadata):
                    if m.get("doc_type") == "case" and m.get("case_number") == case_num:
                        if _dedup_key(m) not in seen_keys:
                            expanded.append(_make_result(m, documents[i], "关系扩展", doc_type="case"))
                            seen_keys.add(_dedup_key(m))
                            print(f" 关系扩展→案例：{case_num}")
                            break

    # 案例 → 法律/解释
    if "law" not in doc_types and "interpretation" not in doc_types:
        all_records_path = Path(__file__).resolve().parent.parent / "data" / "all_records.json"
        if all_records_path.exists():
            with open(all_records_path, "r", encoding="utf-8") as f:
                all_records = json.load(f)

            case_records = {r["id"]: r for r in all_records if r["doc_type"] == "case"}

            for doc in raw_docs:
                meta = doc["metadata"]
                if meta.get("doc_type") != "case":
                    continue

                # 查找 case_id
                case_id = None
                for m in metadata:
                    if m.get("doc_type") == "case" and m.get("case_number") == meta.get("case_number"):
                        case_id = m.get("id")
                        break

                if not case_id or case_id not in case_records:
                    continue

                relations = case_records[case_id].get("relations", {})

                # 补充法律和解释（统一处理，消除重复分支）
                for ref_type, target_doc_type in [("laws", "law"), ("interpretations", "interpretation")]:
                    for ref in relations.get(ref_type, [])[:1]:
                        ref_name = ref.get("name", "")
                        article = ref.get("article", "")
                        for i, m in enumerate(metadata):
                            if (m.get("doc_type") == target_doc_type
                                    and m.get("source") == ref_name
                                    and m.get("article_number") == article):
                                if _dedup_key(m) not in seen_keys:
                                    expanded.append(_make_result(m, documents[i], "关系扩展"))
                                    seen_keys.add(_dedup_key(m))
                                    label = "法律" if target_doc_type == "law" else "解释"
                                    print(f" 关系扩展→{label}：{ref_name} {article}")
                                break

    if expanded:
        print(f"关系扩展：补充了 {len(expanded)} 条相关文档")
        raw_docs.extend(expanded)

    return raw_docs
