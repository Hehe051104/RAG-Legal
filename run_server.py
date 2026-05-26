#!/usr/bin/env python3
"""启动 FastAPI 服务器的入口脚本"""
import sys
from pathlib import Path

# 将 src/ 加入 Python 路径
src_dir = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(src_dir))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
