"""One-click: parse .docx files → JSON → numpy vector store."""
import json
import os
import sys
from pathlib import Path

import numpy as np
import torch
from sentence_transformers import SentenceTransformer

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from data_process import parse_code_perfect, parse_interpretation_perfect, parse_case

DATA_DIR = PROJECT_ROOT / "data"
VECTOR_STORE_DIR = DATA_DIR / "vector_store"
MODEL_NAME = "Qwen/Qwen3-Embedding-0.6B"
BATCH_SIZE = 128


def main():
    # 1 — 加载模型（仅一次）
    print(f"正在加载模型: {MODEL_NAME} ...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"当前使用设备为: {device}")
    model = SentenceTransformer(
        MODEL_NAME,
        device=device,
        model_kwargs={"torch_dtype": torch.float16, "device_map": "auto"},
        tokenizer_kwargs={"padding_side": "left"},
    )

    # 2 — 加载注册表
    registry_path = DATA_DIR / "registry.json"
    if not registry_path.exists():
        print("错误：找不到 registry.json，请先运行 create_registry.py")
        return

    with open(registry_path, "r", encoding="utf-8") as f:
        tasks = json.load(f)

    print(f"所有待处理文件信息加载成功，共 {len(tasks)} 项任务准备就绪...\n")

    # 3 — 解析所有 .docx → JSON
    parsed_data = []
    for i, task in enumerate(tasks):
        docx_name = task["docx_name"]
        full_path = task["full_path"]
        task_type = task["type"]
        output_json = task["output_json"]

        print(f" [解析 {i+1}/{len(tasks)}] {docx_name}")

        if task_type == "code":
            parse_code_perfect(full_path, output_json)
        elif task_type == "case":
            parse_case(full_path, output_json)
        else:
            parse_interpretation_perfect(full_path, output_json)

        with open(output_json, "r", encoding="utf-8") as f:
            articles = json.load(f)
            parsed_data.extend(articles)

    print(f"\n解析完成，共 {len(parsed_data)} 条记录，准备向量化...\n")

    # 4 — 构建向量存储
    documents = [item["content"] for item in parsed_data]
    metadata_list = []
    for item in parsed_data:
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
        for key in ["book", "subbook", "chapter", "section"]:
            if h.get(key):
                meta[key] = h[key]
        metadata_list.append(meta)

    ids = [item["id"] for item in parsed_data]

    # 去重
    seen_ids = set()
    deduped = []
    for i, id_ in enumerate(ids):
        if id_ not in seen_ids:
            seen_ids.add(id_)
            deduped.append(i)
    if len(deduped) < len(ids):
        print(f"发现 {len(ids) - len(deduped)} 条重复 ID，已自动去重")
        ids = [ids[i] for i in deduped]
        documents = [documents[i] for i in deduped]
        metadata_list = [metadata_list[i] for i in deduped]

    # 编码
    print(f"正在编码 {len(documents)} 条文档...")
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
        print(f"编码进度: {end}/{len(documents)}")

    embeddings = np.concatenate(all_embeddings, axis=0).astype(np.float32)
    print(f"Embeddings shape: {embeddings.shape}")

    # 保存
    VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)
    np.save(str(VECTOR_STORE_DIR / "embeddings.npy"), embeddings)
    with open(VECTOR_STORE_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump({"documents": documents, "metadata": metadata_list}, f, ensure_ascii=False)

    print(f"\n{'='*50}")
    print(f"全部完成！共 {len(documents)} 条记录已入库")
    print(f"向量库位置: {VECTOR_STORE_DIR}")
    print(f"  embeddings.npy: {embeddings.shape}")
    print(f"  metadata.json: {len(documents)} records")
    print(f"{'-'*50}")


if __name__ == "__main__":
    main()
