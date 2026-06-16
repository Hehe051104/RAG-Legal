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


# 文档类型显示标签（RAG prompt 和前端 fallback 共用）
DOC_TYPE_LABELS = {"law": "法律条文", "interpretation": "司法解释", "case": "案例"}

# JWT 配置（auth.py 和 api_server.py 共用）
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "120"))
GOOGLE_CLOCK_SKEW_SECONDS = int(os.getenv("GOOGLE_CLOCK_SKEW_SECONDS", "60"))