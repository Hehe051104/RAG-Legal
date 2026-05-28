"""Build numpy vector store from all_records.json. GPU + 内存管理。"""
import json
import os
import gc
from pathlib import Path
import numpy as np

os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODEL_NAME = "Qwen/Qwen3-Embedding-0.6B"
BATCH_SIZE = 4
OUTPUT_DIR = DATA_DIR / "vector_store"


def main():
    import torch
    from sentence_transformers import SentenceTransformer

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load all_records.json
    records_path = DATA_DIR / "all_records.json"
    with open(records_path, "r", encoding="utf-8") as f:
        all_records = json.load(f)
    print(f"Loaded {len(all_records)} records", flush=True)

    # Build metadata and documents
    metadata = []
    documents = []
    ids = []
    for item in all_records:
        h = item.get("hierarchy", {})
        article_num = item.get("article_number") or item.get("case_number") or ""
        meta = {
            "id": item["id"],
            "source": item.get("source", ""),
            "article_number": article_num,
            "doc_type": item.get("doc_type", "law"),
        }
        if item.get("doc_type") == "case":
            meta["case_number"] = item.get("case_number", "")
            meta["court"] = item.get("court", "")
            meta["date"] = item.get("date", "")
            meta["case_type"] = item.get("case_type", "")
        for key in ["book", "subbook", "chapter", "section"]:
            if h.get(key):
                meta[key] = h[key]
        metadata.append(meta)
        # 截断超长文档避免OOM（embedding模型有token限制）
        content = item["content"]
        if len(content) > 4000:
            content = content[:4000]
        documents.append(content)
        ids.append(item["id"])

    # Dedup
    seen = set()
    deduped = []
    for i, id_ in enumerate(ids):
        if id_ not in seen:
            seen.add(id_)
            deduped.append(i)
    if len(deduped) < len(ids):
        print(f"Removed {len(ids) - len(deduped)} duplicates", flush=True)
        metadata = [metadata[i] for i in deduped]
        documents = [documents[i] for i in deduped]

    total = len(documents)
    print(f"Total: {total} documents", flush=True)

    # Load model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}", flush=True)
    model = SentenceTransformer(
        MODEL_NAME,
        device=device,
        model_kwargs={"torch_dtype": torch.float16},
        tokenizer_kwargs={"padding_side": "left"},
    )

    # 检查checkpoint
    checkpoint_path = OUTPUT_DIR / "checkpoint.npy"
    start_idx = 0
    if checkpoint_path.exists():
        existing = np.load(str(checkpoint_path))
        start_idx = existing.shape[0]
        print(f"Resuming from: {start_idx}/{total}", flush=True)

    # 分块编码
    all_embeddings = []
    if start_idx > 0:
        all_embeddings.append(np.load(str(checkpoint_path)))

    for start in range(start_idx, total, BATCH_SIZE):
        end = min(start + BATCH_SIZE, total)
        batch = documents[start:end]

        with torch.no_grad():
            batch_emb = model.encode(
                batch,
                batch_size=BATCH_SIZE,
                convert_to_numpy=True,
                show_progress_bar=False,
            )

        all_embeddings.append(batch_emb)

        # 每100批保存checkpoint
        if (end - start_idx) % 100 == 0 or end == total:
            checkpoint = np.concatenate(all_embeddings, axis=0).astype(np.float32)
            np.save(str(checkpoint_path), checkpoint)

        print(f"Encoding: {end}/{total}", flush=True)

        # 内存清理
        del batch_emb
        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()

    # 合并
    embeddings = np.concatenate(all_embeddings, axis=0).astype(np.float32)
    print(f"Embeddings shape: {embeddings.shape}", flush=True)

    # 保存
    np.save(str(OUTPUT_DIR / "embeddings.npy"), embeddings)
    with open(OUTPUT_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump({"documents": documents, "metadata": metadata}, f, ensure_ascii=False)

    # 删除checkpoint
    if checkpoint_path.exists():
        checkpoint_path.unlink()

    print(f"Saved to {OUTPUT_DIR}", flush=True)
    print(f"  embeddings.npy: {embeddings.shape}", flush=True)
    print(f"  metadata.json: {total} records", flush=True)

    type_counts = {}
    for m in metadata:
        dt = m.get("doc_type", "unknown")
        type_counts[dt] = type_counts.get(dt, 0) + 1
    for dt, count in type_counts.items():
        print(f"  {dt}: {count}", flush=True)


if __name__ == "__main__":
    main()
