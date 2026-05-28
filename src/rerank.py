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
            device="cuda",
            model_kwargs={"torch_dtype": torch.float16}
        )
    return _reranker_instance


def rerank_context(query, raw_docs, model_name, max_length, top_n=5, threshold=-2):
    """两轮重排序：相关性评分 + 类型均衡选择。

    保证最终结果中包含法律/解释和案例两类文档。
    """
    rerank_model = get_rerank_model(model_name, max_length)

    if not raw_docs:
        return []

    # --- 第一轮：相关性评分 ---
    input_pairs = [[query, doc['content']] for doc in raw_docs]
    scores = rerank_model.predict(input_pairs)

    for i in range(len(raw_docs)):
        if raw_docs[i].get('method') == '精准点名':
            raw_docs[i]['rerank_score'] = 999.0
        else:
            raw_docs[i]['rerank_score'] = float(scores[i])

    # 过滤低分
    filtered = [doc for doc in raw_docs if doc['rerank_score'] >= threshold]

    if not filtered:
        return []

    # --- 第二轮：类型均衡选择 ---
    final_results = _type_balanced_select(filtered, top_n)

    for i, res in enumerate(final_results):
        score = res.get('rerank_score', 0)
        source = res['metadata'].get('source', '未知来源')
        article = res['metadata'].get('article_number', '未知编号')
        doc_type = res['metadata'].get('doc_type', 'unknown')
        method = res.get('method', '未知方式')

        print(f"【排名 {i+1}】 得分: {score:.4f} | 类型: {doc_type} | 召回: [{method}]")
        print(f" 来源: {source} | 编号: {article}")
        print("-" * 60)

    return final_results


def _type_balanced_select(docs, top_n):
    """类型均衡选择：保证法律/解释和案例都有代表性。

    策略：
    - 优先保留精准点名的文档（score=999）
    - 从法律/解释中选top，从案例中选top
    - 目标：至少1条法律/解释 + 至少1条案例 + 剩余名额按分数填充
    """
    # 分离精准点名和普通结果
    vip_docs = [d for d in docs if d.get('rerank_score', 0) >= 999]
    normal_docs = [d for d in docs if d.get('rerank_score', 0) < 999]

    # 按分数排序普通结果
    normal_docs.sort(key=lambda x: x['rerank_score'], reverse=True)

    # 按类型分组
    law_docs = [d for d in normal_docs if d['metadata'].get('doc_type') in ('law', 'interpretation')]
    case_docs = [d for d in normal_docs if d['metadata'].get('doc_type') == 'case']

    selected = list(vip_docs)  # VIP直接入选
    remaining_slots = top_n - len(selected)

    if remaining_slots <= 0:
        return selected[:top_n]

    # 从法律中取top
    law_count = min(len(law_docs), max(remaining_slots // 2, 1) if case_docs else remaining_slots)
    selected.extend(law_docs[:law_count])
    remaining_slots -= law_count

    # 从案例中取top
    case_count = min(len(case_docs), max(remaining_slots, 1) if law_docs else 0)
    selected.extend(case_docs[:case_count])
    remaining_slots -= case_count

    # 剩余名额按分数填充
    if remaining_slots > 0:
        used_keys = set(f"{d['metadata'].get('source', '')}_{d['metadata'].get('article_number', '')}" for d in selected)
        for doc in normal_docs:
            if remaining_slots <= 0:
                break
            key = f"{doc['metadata'].get('source', '')}_{doc['metadata'].get('article_number', '')}"
            if key not in used_keys:
                selected.append(doc)
                used_keys.add(key)
                remaining_slots -= 1

    return selected[:top_n]
