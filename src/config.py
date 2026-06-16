import os
import torch
from pathlib import Path

# 设置HuggingFace离线模式（避免SSL错误）
os.environ["HF_HUB_OFFLINE"] = "1"

# 项目根目录：src/ 的上一级
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

class Config:
    # 数据库配置
    DB_PATH = str(DATA_DIR / "vector_store")
    COLLECTION_NAME = "china_law_library"

    # 模型配置
    SEARCH_MODEL = "Qwen/Qwen3-Embedding-0.6B"
    RERANK_MODEL = "BAAI/bge-reranker-v2-m3"
    RAG_MODEL = "Lusizo/qwen2.5-7b-instruct-1m:latest"

    # 运行配置
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

    # 默认算法参数 (后续可以被前端传参覆盖)
    DEFAULT_N_RESULTS = 15
    DEFAULT_TOP_N = 5
    DEFAULT_THRESHOLD = -2
    DEFAULT_MAX_LENGTH = 512

    # 案例数据路径
    CASE_DIR = str(DATA_DIR / "案例")
    CASE_JSON_DIR = str(DATA_DIR / "case_json")