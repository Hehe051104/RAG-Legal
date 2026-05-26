import json
import os
import sys
from pathlib import Path

# 将 src/ 加入 Python 路径
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from data_process import parse_code_perfect, parse_interpretation_perfect, parse_case
from injest import run_ingestion

# 固定参数
DATA_DIR = PROJECT_ROOT / "data"
db_path = str(DATA_DIR / "legal_vector_db")
collection_name = "china_law_library"
model_name = "Qwen/Qwen3-Embedding-0.6B"

def start_batch_work():
    # 清除旧数据库，避免 HNSW 索引损坏问题
    import shutil
    db_dir = Path(db_path)
    if db_dir.exists():
        shutil.rmtree(db_dir)
        print(f"已清除旧数据库: {db_path}")
    db_dir.mkdir(parents=True, exist_ok=True)

    # 加载注册表
    registry_path = DATA_DIR / "registry.json"
    if not registry_path.exists():
        print(" 错误：找不到 registry.json，请先运行 create_registry.py")
        return

    with open(registry_path, "r", encoding="utf-8") as f:
        tasks = json.load(f)

    print(f"所有待处理文件信息加载成功，共 {len(tasks)} 项任务准备就绪...\n")

    #  循环执行：解析 + 入库
    for i, task in enumerate(tasks):
        docx_name = task['docx_name']
        full_path = task['full_path']
        task_type = task['type']
        output_json = task['output_json']

        print(f" [任务 {i+1}/{len(tasks)}] 正在处理: {docx_name}")

        try:
            # 解析过程
            if task_type == 'code':
                parse_code_perfect(full_path, output_json)
            elif task_type == 'case':
                parse_case(full_path, output_json)
            else:
                parse_interpretation_perfect(full_path, output_json)

            # 入库过程
            run_ingestion(
                json_path=output_json,
                db_path=db_path,
                collection_name=collection_name,
                model_name=model_name,
            )

            print(f"{docx_name} 处理并入库成功！")

        except Exception as e:
            print(f" 任务 {i+1} 出错: {docx_name}")
            print(f" 原因: {str(e)}")
            continue

    print("\n" + "="*50)
    print("一键处理全部任务完成.")
    print("-"*50)

if __name__ == "__main__":
    start_batch_work()
