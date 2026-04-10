import requests

def rewrite_query(user_query, history, model_name):
    print("\n正在分析用户意图并重写查询...")
    if not history:
        history_str = "无"
    else:
        history_str = "\n".join([f"用户: {h['user']}\n助手: {h['bot']}" for h in history[-2:]])

    # --- 核心改动：强化 Prompt 的结构化输出能力 ---
    prompt = f"""你是一个专业的法律咨询意图解析器。请结合【对话历史】，将用户的【最新提问】改写为一个独立的搜索语句。

    【核心任务要求】：
    1. 提取法条标签：如果用户在提问中提到了具体的法律名称和条文编号（如“民法典第一千多条”、“刑法第232条”），请务必在输出最前面用标签标出，格式严格为：【法律名-第xxx条】。
       - 注意：数字必须转换为中文大写（如：1064 转为 第一千零六十四）。
       - 如果用户没说哪部法律，只说了条数，格式为：【未知-第xxx条】。
    2. 语义重写：在标签之后，去除口语化废话，提炼出专业的法律搜索关键词。
    3. 特殊意图：如果是闲聊或询问记忆，重写为“请总结并确认之前的咨询内容”。

    【示例】：
    输入：我记得民法典一千多条讲过两口子欠钱那个。
    输出：【中华人民共和国民法典-第一千零六十四条】 夫妻共同债务的认定与承担

    【对话历史】：
    {history_str}

    【最新提问】：
    {user_query}

    请直接输出改写后的结果："""

    payload = {"model": model_name, "prompt": prompt, "stream": False}
    try:
        import requests
        response = requests.post("http://localhost:11434/api/generate", json=payload)
        return response.json().get("response", user_query).strip()
    except:
        return user_query

def call_ollama_rag(query_text, retrieved_docs,history,model_name):
    context = ""
    for i, item in enumerate(retrieved_docs):
        meta = item['metadata']
        content = item['content']
        source = meta.get('source', '未知来源')
        levels = [meta.get("book", ""), meta.get("subbook", ""),
                  meta.get("chapter", ""), meta.get("section", "")]
        path = f'{source} >' + " > ".join([l for l in levels if l])

        context += f"【{i+1}】来源：{path} > {meta['article_number']}\n原文：{content}\n\n"

    history_context = "\n".join([f"用户: {h['user']}\n助手: {h['bot']}" for h in history[-3:]])
    prompt = f"""你是一名专业的法律顾问。请根据以下提供的【法律依据】回答用户的【咨询问题】。

【对话历史】：
{history_context}

【法律依据】：
{context}

【咨询问题】：
{query_text}

【回答要求】：
1. 如果用户在询问之前聊过的话题，请直接根据【对话历史】回答，不要强行套用【法律依据】。
2. 如果用户在咨询新法律问题，请优先使用【法律依据】。
3. 保持专业、连贯的对话风格。
4. 必须优先根据法律依据回答。
5. 引用法条时请注明具体的“条”和“编/章”路径。
6. 如果法律依据不足以回答问题，请如实告知。
7.如果给定的原文中没有相关依据，请诚实回答不知道，严禁私自编造法律条文
"""

    # 调用 Ollama
    print(f" 正在链接本地 大语言模型: {model_name}")
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_ctx": 4096,  # kv限制，防止 1M 模型吞掉所有显存
            "temperature": 0.3 # 法律咨询建议设低一点，更严谨
        }
    }

    try:
        response = requests.post(url, json=payload)
        return response.json().get("response", "模型响应出错")
    except Exception as e:
        return f"连接 Ollama 失败: {str(e)}"