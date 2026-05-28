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
    # 分析用户意图，生成结构化搜索指令。
    # 返回格式：
    # 领域:刑事|【中华人民共和国刑法-第二百六十四条】|法律关键词:盗窃罪、数额较大、入户盗窃|案例关键词:盗窃、入户、量刑
    print("\n正在分析用户意图并重写查询...")

    history_str = _history_to_prompt_text(history, max_messages=8)
    available_laws_list, available_cases_list = get_available_laws()

    prompt = f"""你是一个顶级的法律咨询意图解析器。请结合【对话历史】，将用户的【最新提问】改写为结构化搜索指令。

【输出格式（严格遵守）】
领域:XXX|【法律名-第xxx条】|法律关键词:A、B、C|案例关键词:D、E、F

三个部分用|分隔：
1. 领域: 刑事/民事/行政/劳动/知识产权/商事/国家赔偿 之一
2. 【法律名-第xxx条】: 精准标签（如有）
3. 法律关键词: 3-5个用于搜索法律/解释的术语
4. 案例关键词: 3-5个用于搜索类似案例的术语（案由、行为、争议焦点）

【红线规则】
1) 数字不可改写：用户说"第二条"就输出"第二条"，不可变成其他条号
2) 禁止过度联想：用户没说具体罪名，不要脑补
3) 领域判断优先：先判断属于什么法律领域，再选法律

【示例】
输入：刑法第二条
输出：领域:刑事|【中华人民共和国刑法-第二条】|法律关键词:刑法任务、基本原则、适用范围|案例关键词:刑法适用

输入：我高空抛物了
输出：领域:民事|【中华人民共和国民法典-第一千二百五十四条】|法律关键词:高空抛物、侵权责任、建筑物管理人|案例关键词:高空抛物、损害赔偿、过错推定

输入：公司不给我加班费怎么办
输出：领域:劳动|【中华人民共和国劳动法-第四十四条】|法律关键词:加班费、工资报酬、劳动争议|案例关键词:加班费、劳动仲裁、考勤记录

输入：我在网上被骗了5000块钱
输出：领域:刑事|【中华人民共和国刑法-第二百六十六条】|法律关键词:诈骗罪、数额较大、网络诈骗|案例关键词:诈骗、网络犯罪、立案标准

输入：二手房买卖跳单
输出：领域:民事|【指导案例1号】|法律关键词:居间合同、违约责任|案例关键词:二手房、跳单、中介费

输入：盗窃罪怎么判
输出：领域:刑事|【中华人民共和国刑法-第二百六十四条】|法律关键词:盗窃罪、量刑标准、数额较大|案例关键词:盗窃、量刑、从轻从重

【本地可用法律清单】：
{available_laws_list}

【本地可用案例清单】：
{available_cases_list}

【对话历史】：
{history_str}

【最新提问】：
{user_query}

请直接输出结构化搜索指令："""

    payload = {"model": model_name, "prompt": prompt, "stream": False}
    try:
        response = requests.post("http://localhost:11434/api/generate", json=payload)
        result = response.json().get("response", "").strip()
        if result:
            print(f"改写结果: {result}")
            return result
        return user_query
    except Exception as e:
        print(f"大模型请求失败: {e}")
        return user_query


def parse_rewrite_result(rewrite_text):
    """解析改写结果，提取领域、标签、关键词。

    返回: {
        'domain': '刑事',
        'tags': ['【中华人民共和国刑法-第二百六十四条】'],
        'law_keywords': '盗窃罪、数额较大、入户盗窃',
        'case_keywords': '盗窃、入户、量刑',
        'raw': '原始文本'
    }
    """
    result = {
        'domain': '',
        'tags': [],
        'law_keywords': '',
        'case_keywords': '',
        'raw': rewrite_text
    }

    if not rewrite_text:
        return result

    # 提取领域
    domain_match = re.search(r'领域[:：]\s*(刑事|民事|行政|劳动|知识产权|商事|国家赔偿)', rewrite_text)
    if domain_match:
        result['domain'] = domain_match.group(1)

    # 提取标签
    result['tags'] = re.findall(r'【([^】]+)】', rewrite_text)

    # 提取法律关键词
    law_kw_match = re.search(r'法律关键词[:：]\s*(.+?)(?:\|案例关键词|$)', rewrite_text)
    if law_kw_match:
        result['law_keywords'] = law_kw_match.group(1).strip()

    # 提取案例关键词
    case_kw_match = re.search(r'案例关键词[:：]\s*(.+?)$', rewrite_text)
    if case_kw_match:
        result['case_keywords'] = case_kw_match.group(1).strip()

    # 如果没有结构化格式，回退：整个文本作为关键词
    if not result['domain'] and not result['tags']:
        result['law_keywords'] = rewrite_text
        result['case_keywords'] = rewrite_text

    return result

def call_ollama_rag(query_text, retrieved_docs,history,model_name):
    context = ""
    for i, item in enumerate(retrieved_docs):
        meta = item['metadata']
        content = item['content']
        source = meta.get('source', '未知来源')
        doc_type = meta.get('doc_type', 'law')

        # 标注文档类型
        type_label = {"law": "法律条文", "interpretation": "司法解释", "case": "案例"}.get(doc_type, "法律依据")

        # 构建来源路径
        if doc_type == "case":
            case_number = meta.get('case_number', '')
            court = meta.get('court', '')
            date = meta.get('date', '')
            path = f"{court} {case_number} {date}".strip()
        else:
            path = source

        context += f"【{i+1}】[{type_label}] {path}\n{content}\n\n"

    # 保持原有"最近三轮上下文"的语义，按消息数约等于最近 6 条
    history_context = _history_to_prompt_text(history, max_messages=10)
    prompt = f"""你是一名专业的法律顾问，采用IRAC法律分析方法回答问题。

【IRAC分析框架】：
- Issue（法律争点）：识别用户问题中的核心法律争议点
- Rule（法律规则）：引用适用的法律条文和司法解释
- Application（适用分析）：将法律规则与具体事实相结合，参考类似案例的裁判理由
- Conclusion（结论）：参考裁判要旨，给出明确的法律意见和建议

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
引用【法律依据】中的法律条文和司法解释：
- 《法律名》第X条规定：...
- 根据XX司法解释第X条：...

## 三、适用分析（Application）
将法律规则与用户的具体情况进行分析：
- 事实认定：根据用户描述，认定关键事实
- 法律适用分析：将法律规则应用于具体事实
- 类案参考：引用【法律依据】中的类似案例，说明法院如何裁判
- 有利/不利因素分析

## 四、结论（Conclusion）
- 参考裁判要旨，给出明确的法律意见
- 具体建议
- 风险提示

【注意事项】：
1. 如果用户在询问之前聊过的话题，请直接根据【对话历史】回答。
2. 必须优先使用【法律依据】中的内容，不得编造法条。
3. 如果法律依据不足，请如实告知并建议咨询专业律师。
4. 引用法条时注明具体"条"和来源。
5. 参考案例时注明案号和法院。
6. 保持专业、严谨的法律分析风格。
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

        # 标注文档类型
        type_label = {"law": "法律条文", "interpretation": "司法解释", "case": "案例"}.get(doc_type, "法律依据")

        # 构建来源路径
        if doc_type == "case":
            case_number = meta.get('case_number', '')
            court = meta.get('court', '')
            date = meta.get('date', '')
            path = f"{court} {case_number} {date}".strip()
        else:
            path = source

        context += f"【{i+1}】[{type_label}] {path}\n{content}\n\n"

    history_context = _history_to_prompt_text(history, max_messages=10)
    prompt = f"""你是一名专业的法律顾问，采用IRAC法律分析方法回答问题。

【IRAC分析框架】：
- Issue（法律争点）：识别用户问题中的核心法律争议点
- Rule（法律规则）：引用适用的法律条文和司法解释
- Application（适用分析）：将法律规则与具体事实相结合，参考类似案例的裁判理由
- Conclusion（结论）：参考裁判要旨，给出明确的法律意见和建议

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
引用【法律依据】中的法律条文和司法解释：
- 《法律名》第X条规定：...
- 根据XX司法解释第X条：...

## 三、适用分析（Application）
将法律规则与用户的具体情况进行分析：
- 事实认定：根据用户描述，认定关键事实
- 法律适用分析：将法律规则应用于具体事实
- 类案参考：引用【法律依据】中的类似案例，说明法院如何裁判
- 有利/不利因素分析

## 四、结论（Conclusion）
- 参考裁判要旨，给出明确的法律意见
- 具体建议
- 风险提示

【注意事项】：
1. 如果用户在询问之前聊过的话题，请直接根据【对话历史】回答。
2. 必须优先使用【法律依据】中的内容，不得编造法条。
3. 如果法律依据不足，请如实告知并建议咨询专业律师。
4. 引用法条时注明具体"条"和来源。
5. 参考案例时注明案号和法院。
6. 保持专业、严谨的法律分析风格。
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
