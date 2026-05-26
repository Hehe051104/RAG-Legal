import sys
from pathlib import Path

# 将 src/ 加入 Python 路径
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from search import *
from RAG import *
from rerank import *

db_path = str(PROJECT_ROOT / "data" / "legal_vector_db")
collection_name = "china_law_library"

search_model_name = "Qwen/Qwen3-Embedding-0.6B"
n_results=15 # search一下子找出多少条数据给rerank

rag_model_name='Lusizo/qwen2.5-7b-instruct-1m:latest'

rerank_model_name=('BAAI/bge-reranker-v2-m3')
max_length=512  # [query,content] 拼接起来塞进模型的最大长度
top_n=5  # 最后取分数最高的前几
threshold=-2  # 阈值,低于的认为不相关

def main():
    history = [] # 历史记录

    while True:
        user_input = input("\n请输入您的问题:...(q,quit,exit退出.. )\n")
        if user_input.lower() in ['q', 'quit', 'exit']: break

        # 重写请求：将模糊的"上面聊了什么"转为"总结对话"
        search_query = rewrite_query(user_input, history,rag_model_name)

        # 意图预判：如果是询问记忆或闲聊，直接跳过检索
        skip_words = ["总结", "记忆", "之前", "聊了什么", "你是谁"]
        should_skip_search = any(word in search_query for word in skip_words)

        formatted_docs = []

        if not should_skip_search:
            raw_docs = run_search(search_query, db_path, collection_name, search_model_name, n_results)

            if raw_docs:
                final_results = rerank_context(search_query, raw_docs, rerank_model_name, max_length, top_n, threshold)

                print("\n" + " [透明测试] 最终塞给大模型的法律条文 " )
                if not final_results:
                    print(" 警告：重排后所有法条均被低分过滤，大模型将仅靠自身记忆回答。")
                else:
                    for i, doc in enumerate(final_results):
                        print(f"  条文 {i+1}: {doc['metadata']['source']} - {doc['metadata']['article_number']}")
                print("="*68 + "\n")

                formatted_docs = final_results
            else:
                print("本地法律库未匹配到相关条文，将由模型尝试回答。")

        answer = call_ollama_rag(user_input, formatted_docs, history,rag_model_name)

        print("\n" + "="*30 + " 律师建议 " + "="*30)
        print(answer)
        print("="*68)

        history.append({"user": user_input, "bot": answer})

        torch.cuda.empty_cache()

if __name__ == "__main__":
    main()
