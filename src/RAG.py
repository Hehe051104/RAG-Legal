import requests
import json
import os
from pathlib import Path
from typing import Any, Dict, List

# 项目根目录
PROJECT_ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = PROJECT_ROOT / "data" / "registry.json"

# --- 新增：读取本地已有法律清单的函数 ---
def get_available_laws():
    """从 registry.json 中提取所有已入库的法律、解释和案例名称"""
    try:
        if not REGISTRY_PATH.exists():
            return "暂无清单，请按常识推断。", "暂无案例清单。"

        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            tasks = json.load(f)

        # 按类型分组
        law_names = []
        case_names = []
        for task in tasks:
            name = task['docx_name'].replace('.docx', '')
            if task.get('type') == 'case':
                case_names.append(name)
            else:
                law_names.append(name)

        law_list = "\n".join([f"- {name}" for name in law_names]) if law_names else "暂无法律清单。"
        case_list = "\n".join([f"- {name}" for name in case_names]) if case_names else "暂无案例清单。"

        return law_list, case_list
    except Exception as e:
        print(f"读取清单失败: {e}")
        return "暂无清单，请按常识推断。", "暂无案例清单。"


def _normalize_history_messages(history: List[Any]) -> List[Dict[str, str]]:
    """
    将 history 统一转换为 role/content 格式：
    [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]

    兼容输入：
    1) 新格式：{"role": "user|assistant", "content": "..."}
    2) 旧格式：{"user": "...", "bot": "..."}
    3) Pydantic 对象（如 HistoryMessage）
    """
    normalized: List[Dict[str, str]] = []

    if not history:
        return normalized

    for item in history:
        # 兼容 Pydantic v2 对象
        if hasattr(item, "model_dump"):
            item = item.model_dump()

        if not isinstance(item, dict):
            continue

        role = item.get("role")
        content = item.get("content")

        # 新格式: {role, content}
        if role in ("user", "assistant") and isinstance(content, str):
            text = content.strip()
            if text:
                normalized.append({"role": role, "content": text})
            continue

        # 旧格式: {user, bot}
        user_text = item.get("user")
        bot_text = item.get("bot")

        if isinstance(user_text, str) and user_text.strip():
            normalized.append({"role": "user", "content": user_text.strip()})
        if isinstance(bot_text, str) and bot_text.strip():
            normalized.append({"role": "assistant", "content": bot_text.strip()})

    return normalized


def _history_to_prompt_text(history: List[Any], max_messages: int) -> str:
    messages = _normalize_history_messages(history)

    if not messages:
        return "无"

    recent_messages = messages[-max_messages:]
    return "\n".join(
        [
            f"{'用户' if msg['role'] == 'user' else '助手'}: {msg['content']}"
            for msg in recent_messages
        ]
    )

def rewrite_query(user_query, history, model_name):
    print("\n正在分析用户意图并重写查询...")

    # 保持原有“最近两轮上下文”的语义，按消息数约等于最近 4 条
    history_str = _history_to_prompt_text(history, max_messages=8)

    # 动态获取菜单
    available_laws_list, available_cases_list = get_available_laws()

    # --- 核心改动：把清单加入 Prompt，并强约束它的输出 ---
    prompt = f"""你是一个顶级的法律咨询意图解析器。请结合【对话历史】，将用户的【最新提问】改写为一个独立的搜索语句。

【系统内部通讯唯一合法暗号（必须严格遵守）】
你输出的法条标签必须严格使用：
【法律名-第xxx条】

严禁输出以下任何非法格式：
- 【法律名 第xxx条】
- 【法律名第xxx条】
- 法律名:第xxx条
- 其他不带中括号或不带横杠的写法

只要你判断出了法律名和条号，就必须使用带横杠的标准格式输出。

【红线规则（绝对优先，违反即判错）】
1) 数字神圣不可侵犯：
    - 如果用户提问中包含明确条号数字（如“第二条”“第10条”“第十条”），你输出标签时必须且只能使用该数字对应的条号。
    - 严禁以任何理由改写、放大、缩小或替换数字（例如把“第二条”改成“第二百三十二条”）。

2) 禁止过度联想：
    - 当用户提问非常简洁（如“刑法第二条”）时，只提取该条目的核心法律含义关键词。
    - 在用户没有明确提及“杀人”“抢劫”等行为时，严禁自行脑补具体罪名。

3) 指令优先级：
    - 用户输入中的显式数字优先级最高，高于任何示例、经验规则和上下文推断。
    - 若示例与用户显式数字冲突，必须以用户输入数字为准。

【Few-Shot 少样本示例（用于格式演示，不得覆盖用户显式数字）】
示例1：
输入：刑法第二条
输出：【中华人民共和国刑法-第二条】刑法适用范围、法律适用、基本原则

示例2：
输入：我高空抛物了
输出：【中华人民共和国民法典-第一千二百五十四条】高空抛物、侵权责任、过错认定、损害赔偿、举证责任

示例3：
输入：我杀人了
输出：【中华人民共和国刑法-第二百三十二条】故意杀人、刑事责任、量刑标准、主观故意、从重从轻情节

【任务一：格式化法条标签（精准检索专用）】
1. 格式严格为：【法律名-第xxx条】。
2. 提取准则：必须严格提取【最新提问】中的数字并转为中文大写，不得改写为其他条号。
3. 法律名判定：
   - ⚠️ **话题漂移判定**：先判断【最新提问】是否开启了与【对话历史】完全不同的法律领域（如从民事转为刑事）。
   - 如果发生领域大跨度跳转，请果断放弃沿用，将法律名写为“未知”。
   - 只有在逻辑高度连贯（如都在聊离婚或都在聊合同）时，才允许沿用法律名。

【任务二：语义重写（向量搜索专用）】
在标签后增加 3-5 个关键词，必须遵循以下“法学专家”原则：
1. **领域分诊**：先在内心判断这是刑事、民事还是行政。
2. **动词优先**：必须保留用户行为的核心动词（如：杀害、抢劫、自首、坠落、违约）。**严禁将刑事动作（杀人）弱化为民事权利（生命权）。**
3. **术语转化**：将口语（我不小心弄坏了）转化为术语（财产损害、过失侵权）。

4. **案例关联**：
   - 当用户描述具体案情（如"我被公司辞退了""我在网上被骗了"）时，生成【指导案例X号】格式的标签指向最相关的案例。
   - 当用户问"XX案例怎么判"或提到具体案例名时，直接生成对应案例标签。
   - 同时增加案例相关语义关键词（如：工伤认定、交通事故、合同违约）。

5. **案例标签格式**：案例标签格式为【案例-关键词】或【指导案例X号】。

6. **法律争点识别**：在关键词中识别并标注核心法律争点。
   示例：
   输入：公司不给我加班费怎么办
   输出：【中华人民共和国劳动法-第四十四条】加班费、劳动争议、举证责任、考勤记录

   输入：二手房买卖跳单
   输出：【指导案例1号】居间合同、二手房买卖、违约、中介费

   输入：我在网上被骗了5000块钱
   输出：【中华人民共和国刑法-第二百六十六条】诈骗罪、网络诈骗、刑事责任、立案标准

【本地可用法律清单】：
{available_laws_list}


【本地可用案例清单】：
{available_cases_list}

【对话历史】：
{history_str}

【最新提问】：
{user_query}

请直接输出改写后的结果（标签 + 关键词）："""

    payload = {"model": model_name, "prompt": prompt, "stream": False}
    try:
        response = requests.post("http://localhost:11434/api/generate", json=payload)
        return response.json().get("response", user_query).strip()
    except Exception as e:
        print(f"大模型请求失败: {e}")
        return user_query

def call_ollama_rag(query_text, retrieved_docs,history,model_name):
    context = ""
    for i, item in enumerate(retrieved_docs):
        meta = item['metadata']
        content = item['content']
        source = meta.get('source', '未知来源')
        doc_type = meta.get('doc_type', 'law')
        levels = [meta.get("book", ""), meta.get("subbook", ""),
              meta.get("chapter", ""), meta.get("section", "")]
        path = f"{source} >" + " > ".join([l for l in levels if l])

        # 标注文档类型
        type_label = {"law": "法律条文", "interpretation": "司法解释", "case": "案例"}.get(doc_type, "法律依据")
        context += f"【{i+1}】[{type_label}] 来源：{path} > {meta['article_number']}\n原文：{content}\n\n"

    # 保持原有”最近三轮上下文”的语义，按消息数约等于最近 6 条
    history_context = _history_to_prompt_text(history, max_messages=10)
    prompt = f"""你是一名专业的法律顾问，采用IRAC法律分析方法回答问题。

【IRAC分析框架】：
- Issue（法律争点）：识别用户问题中的核心法律争议点
- Rule（法律规则）：引用适用的法律条文、司法解释和案例
- Application（适用分析）：将法律规则与具体事实相结合进行分析
- Conclusion（结论）：给出明确的法律意见和建议

【对话历史】：
{history_context}

【法律依据】：
{context}

【咨询问题】：
{query_text}

【回答要求】：
请严格按照IRAC框架回答：

## 一、法律争点（Issue）
明确指出用户问题中的核心法律争议点。

## 二、法律规则（Rule）
引用【法律依据】中的具体法条、司法解释或案例。格式：
- 《法律名》第X条规定：...
- 根据XX司法解释：...
- 参考案例：...

## 三、适用分析（Application）
将法律规则与用户的具体情况进行分析：
- 事实认定
- 法律适用分析
- 有利/不利因素分析

## 四、结论（Conclusion）
- 明确的法律意见
- 具体建议
- 风险提示

【注意事项】：
1. 如果用户在询问之前聊过的话题，请直接根据【对话历史】回答。
2. 必须优先使用【法律依据】中的内容，不得编造法条。
3. 如果法律依据不足，请如实告知并建议咨询专业律师。
4. 引用法条时注明具体"条"和来源。
5. 保持专业、严谨的法律分析风格。
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

def call_ollama_rag_stream(query_text, retrieved_docs, history, model_name):
    """流式版本的 RAG 生成函数，逐 token yield 返回。"""
    context = ""
    for i, item in enumerate(retrieved_docs):
        meta = item['metadata']
        content = item['content']
        source = meta.get('source', '未知来源')
        doc_type = meta.get('doc_type', 'law')
        levels = [meta.get("book", ""), meta.get("subbook", ""),
                  meta.get("chapter", ""), meta.get("section", "")]
        path = f'{source} >' + " > ".join([l for l in levels if l])
        type_label = {"law": "法律条文", "interpretation": "司法解释", "case": "案例"}.get(doc_type, "法律依据")
        context += f"【{i+1}】[{type_label}] 来源：{path} > {meta['article_number']}\n原文：{content}\n\n"

    history_context = _history_to_prompt_text(history, max_messages=10)
    prompt = f"""你是一名专业的法律顾问，采用IRAC法律分析方法回答问题。

【IRAC分析框架】：
- Issue（法律争点）：识别用户问题中的核心法律争议点
- Rule（法律规则）：引用适用的法律条文、司法解释和案例
- Application（适用分析）：将法律规则与具体事实相结合进行分析
- Conclusion（结论）：给出明确的法律意见和建议

【对话历史】：
{history_context}

【法律依据】：
{context}

【咨询问题】：
{query_text}

【回答要求】：
请严格按照IRAC框架回答：

## 一、法律争点（Issue）
明确指出用户问题中的核心法律争议点。

## 二、法律规则（Rule）
引用【法律依据】中的具体法条、司法解释或案例。格式：
- 《法律名》第X条规定：...
- 根据XX司法解释：...
- 参考案例：...

## 三、适用分析（Application）
将法律规则与用户的具体情况进行分析：
- 事实认定
- 法律适用分析
- 有利/不利因素分析

## 四、结论（Conclusion）
- 明确的法律意见
- 具体建议
- 风险提示

【注意事项】：
1. 如果用户在询问之前聊过的话题，请直接根据【对话历史】回答。
2. 必须优先使用【法律依据】中的内容，不得编造法条。
3. 如果法律依据不足，请如实告知并建议咨询专业律师。
4. 引用法条时注明具体"条"和来源。
5. 保持专业、严谨的法律分析风格。
"""

    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": True,
        "options": {
            "num_ctx": 4096,
            "temperature": 0.3
        }
    }

    try:
        response = requests.post(url, json=payload, stream=True)
        response.raise_for_status()
        for line in response.iter_lines():
            if not line:
                continue
            try:
                chunk = json.loads(line)
                token = chunk.get("response", "")
                if token:
                    yield token
                if chunk.get("done", False):
                    break
            except json.JSONDecodeError:
                continue
    except Exception as e:
        yield f"连接 Ollama 失败: {str(e)}"
