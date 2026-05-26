import torch
from sentence_transformers import CrossEncoder

# 解决模型只需加载一次问题
_reranker_instance = None

def get_rerank_model(model_name, max_length):
    global _reranker_instance
    if _reranker_instance is None:
        print(f"[首次加载] 正在初始化 Reranker模型: {model_name}")
        _reranker_instance = CrossEncoder(
            model_name,
            max_length=max_length,
            device="cuda", # 确保在显卡上跑
            model_kwargs={"torch_dtype": torch.float16}  # 半精度,不然爆显存了
        )
    return _reranker_instance

# 把search找到的results再塞进rerank,找到更相近的
def rerank_context(query, raw_docs, model_name ,max_length,top_n=3, threshold=-5):

    rerank_model = get_rerank_model(model_name, max_length)

    if not raw_docs:
        return []

    # 构造交叉编码器的输入对：[[问题, 法条1], [问题, 法条2], ...]
    # 注意：search_results 里面包含 content 和 metadata   不能只有content,不然做完之后就不知道这个东西来自哪里了
    # search函数的结果results是字典. (results[documents][0]才能得到所有的content),要与metadatas一对一,转成列表
    # 拿出results[0]里的每一项的content(或documents)和metadata构成raw_docs [{"content": d, "metadata": m}......]方便rerank函数求值与排序
    input_pairs = [[query, doc['content']] for doc in raw_docs]

    # 模型打分
    scores = rerank_model.predict(input_pairs)

    # 并给 VIP 发免死金牌 ,rerank不会将其删掉
    for i in range(len(raw_docs)):
        if raw_docs[i].get('method') == '精准点名':
            raw_docs[i]['rerank_score'] = 999.0  # 强行拉满分数！
        else:
            raw_docs[i]['rerank_score'] = float(scores[i])

    # 按 Rerank 分数从高到低排序
    sorted_results = sorted(raw_docs, key=lambda x: x['rerank_score'], reverse=True)

    # 阈值过滤：只保留真正相关的
    final_results = [res for res in sorted_results if res['rerank_score'] >= threshold]
    final_results=final_results[:top_n]

    for i, res in enumerate(final_results):
        score = res.get('rerank_score', 0)
        source = res['metadata'].get('source', '未知来源')
        article = res['metadata'].get('article_number', '未知编号')
        content = res['content'].replace('\n', ' ')
        method = res.get('method', '未知方式') #  提取在 search 里打的标签


        print(f"【排名 {i+1}】 Rerank得分: {score:.4f}  |  召回方式: [{method}]")
        print(f" 来源: {source} | 编号: {article}")
        print(f" 预览: {content[:80]}...") # 限制输出80个字
        print("-" * 60)

    return final_results