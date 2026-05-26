"""Build numpy vector store from JSON files. Replaces ChromaDB ingestion."""
import json
import os
from pathlib import Path
import numpy as np
import torch
from sentence_transformers import SentenceTransformer

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODEL_NAME = "Qwen/Qwen3-Embedding-0.6B"
BATCH_SIZE = 128
OUTPUT_DIR = DATA_DIR / "vector_store"


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load all parsed JSON records
    all_records = []
    for subdir in ["code_json", "interpretation_json", "case_json"]:
        path = DATA_DIR / subdir
        if not path.exists():
            continue
        for f in sorted(os.listdir(path)):
            if f.endswith(".json"):
                with open(path / f, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                    all_records.extend(data)

    print(f"Loaded {len(all_records)} records from JSON files")

    # Build metadata list
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
        # hierarchy for display
        for key in ["book", "subbook", "chapter", "section"]:
            if h.get(key):
                meta[key] = h[key]
        metadata.append(meta)
        documents.append(item["content"])
        ids.append(item["id"])

    # Dedup by ID
    seen = set()
    deduped = []
    for i, id_ in enumerate(ids):
        if id_ not in seen:
            seen.add(id_)
            deduped.append(i)
    if len(deduped) < len(ids):
        print(f"Removed {len(ids) - len(deduped)} duplicates")
        metadata = [metadata[i] for i in deduped]
        documents = [documents[i] for i in deduped]
        ids = [ids[i] for i in deduped]

    print(f"Encoding {len(documents)} documents...")

    # Load model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")
    model = SentenceTransformer(
        MODEL_NAME,
        device=device,
        model_kwargs={"torch_dtype": torch.float16, "device_map": "auto"},
        tokenizer_kwargs={"padding_side": "left"},
    )

    # Batch encode
    all_embeddings = []
    for start in range(0, len(documents), BATCH_SIZE):
        end = min(start + BATCH_SIZE, len(documents))
        batch_emb = model.encode(
            documents[start:end],
            batch_size=BATCH_SIZE,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        all_embeddings.append(batch_emb)
        print(f"Encoding: {end}/{len(documents)}")

    embeddings = np.concatenate(all_embeddings, axis=0).astype(np.float32)
    print(f"Embeddings shape: {embeddings.shape}")

    # Save
    np.save(str(OUTPUT_DIR / "embeddings.npy"), embeddings)
    with open(OUTPUT_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump({"documents": documents, "metadata": metadata}, f, ensure_ascii=False)

    print(f"Saved to {OUTPUT_DIR}")
    print(f"  embeddings.npy: {embeddings.shape}")
    print(f"  metadata.json: {len(documents)} records")


if __name__ == "__main__":
    main()
