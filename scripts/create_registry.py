import json
import os
from pathlib import Path

# 项目根目录和数据目录
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# 扫描 data/ 目录下的文件夹
# 键是类型，值是对应的文件夹名称
search_folders = {
    "code": "法律原文",
    "interpretation": "司法解释",
    "case": "案例"
}

def create_registry(output_file=None):
    if output_file is None:
        output_file = str(DATA_DIR / "registry.json")

    tasks = []

    print("正在扫描法律原文与司法解释文件夹，生成清单...")

    for task_type, folder_name in search_folders.items():
        root_path = DATA_DIR / folder_name

        if not root_path.exists():
            print(f" 警告：找不到目录 '{root_path}'，已跳过。")
            continue

        # rglob("*.docx")：递归搜索所有子目录下的 docx 文件
        for docx_path in root_path.rglob("*.docx"):
            # 过滤 Word 的临时文件 (以 ~$ 开头的)
            if docx_path.name.startswith("~$"):
                continue

            # 提取文件名（不带后缀），用于生成 JSON 路径
            file_stem = docx_path.stem

            # 自动分配输出 JSON 文件夹
            if task_type == "code":
                json_dir = str(DATA_DIR / "code_json")
            elif task_type == "case":
                json_dir = str(DATA_DIR / "case_json")
            else:
                json_dir = str(DATA_DIR / "interpretation_json")

            # 构造任务字典
            task = {
                "docx_name": docx_path.name,
                "full_path": str(docx_path).replace("\\", "/"),
                "type": task_type,
                "output_json": f"{json_dir}/{file_stem}.json"
            }
            tasks.append(task)
            print(f" 录入任务: [{task_type}] {docx_path.name}")

    # 写入 JSON 文件
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(tasks, f, ensure_ascii=False, indent=4)

    print("-" * 50)
    print(f"注册表生成成功！共计 {len(tasks)} 个法律文件。")
    print(f"文件位置: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    create_registry()
