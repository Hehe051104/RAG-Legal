import torch
import chromadb
from sentence_transformers import SentenceTransformer
import re

# db_path = "./legal_vector_db"
# collection_name = "china_civil_code"
# model_name = "Qwen/Qwen3-Embedding-0.6B"

_embedding_model_instance = None
_chroma_client = None

# 优化,解决一次加载常驻内存 无需重复加载
def get_resources(db_path, model_name):
    """内部函数：确保数据库客户端和模型只加载一次"""
    global _embedding_model_instance, _chroma_client

    #  加载数据库客户端
    if _chroma_client is None:
        print(f" [首次加载] 正在连接数据库: {db_path}")
        _chroma_client = chromadb.PersistentClient(path=db_path)

    #  加载 Embedding 模型
    if _embedding_model_instance is None:
        print(f" [首次加载] 正在加载 Embedding 模型: {model_name}")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f'当前使用设备为: {device}')
        _embedding_model_instance = SentenceTransformer(
            model_name,
            device=device,
            model_kwargs={"torch_dtype": torch.float16}
        )

    return _chroma_client, _embedding_model_instance


def run_search(query_text, db_path, collection_name, model_name, n_results):
    client, model = get_resources(db_path, model_name)
    collection = client.get_collection(name=collection_name)

    print(f"\n 大模型重写指令: {query_text}")
    print("正在检索法律依据\n")

    final_raw_docs = []
    seen_keys = set() # 用于去重

    # 标签拦截
    tags = re.findall(r'【(.*?)】', query_text)

    for tag in tags:
        parts = tag.split('-')
        law_name = parts[0] if len(parts) > 1 and parts[0] != "未知" else None
        article_num = parts[-1]

        # 构造过滤条件
        where_cond = {"article_number": article_num}
        print(f" [精准拦截触发] 尝试直接提取数据库：{tag}")
        res = collection.get(where=where_cond)

        if res['documents']:
            for d, m in zip(res['documents'], res['metadatas']):
                # Python 级别比对：如果标签里有法律名，判断它是否在数据库的 source 里
                if law_name and law_name not in m.get('source', ''):
                    continue # 名字对不上，跳过！

                key = f"{m['source']}_{m['article_number']}"
                if key not in seen_keys:
                    #  新增 "method": 怎么找来的
                    final_raw_docs.append({"content": d, "metadata": m, "method": "精准点名"})
                    seen_keys.add(key)
                    print(f"[精准命中]：{m['source']} {m['article_number']}")
                    print(f"内容预览: {d[:60]}...")

        else:
            print(f"数据库中未找到确切对应的法条：{tag}")

    # 纯向量检索
    pure_semantic_query = re.sub(r'【.*?】', '', query_text).strip()

    if pure_semantic_query:
        print(f" [向量检索启动] 语义关键词: {pure_semantic_query}")
        query_embedding = model.encode([pure_semantic_query], prompt_name="query", convert_to_numpy=True).tolist()
        vector_results = collection.query(query_embeddings=query_embedding, n_results=n_results)

        for i in range(len(vector_results['documents'][0])):
            d = vector_results['documents'][0][i]
            m = vector_results['metadatas'][0][i]
            key = f"{m['source']}_{m['article_number']}"

            if key not in seen_keys:
                #  新增 "method": "向量召回"
                final_raw_docs.append({"content": d, "metadata": m, "method": "向量召回"})
                seen_keys.add(key)

    # 简单打印一下收集到的总数
    print(f"\n 检索完毕，共收集到 {len(final_raw_docs)} 条候选法条进入重排阶段。")
    print("-" * 60)

    return final_raw_docs

""" 
results结构
{
    "documents": [ 
        ["法条A", "法条B", "法条C"] , [                   ] // 这是第一个问题的搜索结果 (索引 0)
    ],
    "metadatas": [
        [{"src": "民法典"}, {"src": "刑法"}, {"src": "担保解释"}] , [                   ] 
    ],
    "distances": [
        [0.12, 0.45, 0.88] , [                   ] 
    ]
}
"""