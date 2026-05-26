from contextlib import asynccontextmanager
import asyncio
from datetime import datetime, timedelta, timezone
import inspect
import json
import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from jose import ExpiredSignatureError, JWTError
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uvicorn
import torch

# 导入咱们自己写的核心模块
from config import Config
from search import run_search
from rerank import rerank_context
from RAG import rewrite_query, call_ollama_rag, call_ollama_rag_stream
from database import init_db
from routers.auth import (
    AuthError,
    JWT_EXPIRE_MINUTES,
    decode_access_token,
    router as auth_router,
)


ONLINE_TTL_SECONDS = int(os.getenv("ONLINE_TTL_SECONDS", "75"))
online_users_last_seen: dict[str, datetime] = {}
online_users_profile: dict[str, dict[str, str | None]] = {}
online_users_lock = asyncio.Lock()


def _normalize_validation_field(loc: tuple[object, ...] | list[object] | None) -> str:
    if not loc:
        return "参数"

    field_alias = {
        "full_name": "全名",
        "email": "邮箱",
        "password": "密码",
        "new_password": "新密码",
        "code": "验证码",
    }

    parts: list[str] = []
    for item in loc:
        if isinstance(item, str) and item not in {"body", "query", "path", "header"}:
            parts.append(field_alias.get(item, item))

    return ".".join(parts) if parts else "参数"


def _translate_validation_error(error: dict[str, object]) -> str:
    error_type = str(error.get("type") or "")
    loc = error.get("loc")
    field_name = _normalize_validation_field(loc if isinstance(loc, (tuple, list)) else None)
    ctx = error.get("ctx") if isinstance(error.get("ctx"), dict) else {}

    if error_type == "string_too_short":
        min_length = int(ctx.get("min_length") or 0)
        if min_length > 0:
            return f"{field_name}至少需要 {min_length} 个字符"
        return f"{field_name}长度太短"

    if error_type == "string_too_long":
        max_length = int(ctx.get("max_length") or 0)
        if max_length > 0:
            return f"{field_name}最多支持 {max_length} 个字符"
        return f"{field_name}长度过长"

    if error_type == "missing":
        return f"缺少必填字段：{field_name}"

    if error_type == "value_error":
        return f"{field_name}格式不正确"

    return f"{field_name}参数校验失败"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    yield

# 初始化 FastAPI 应用
app = FastAPI(
    title="法律大模型智能体 API",
    description="提供给前端调用的标准 RESTful 接口，支持自定义检索参数。",
    version="1.0.0",
    lifespan=lifespan,
    servers=[ # 不加这段会认为网页在哪,api在哪 会去手机的8000端口
        {"url": "https://api.hehe051104.me", "description": "公网生产环境"},
        {"url": "http://127.0.0.1:8000", "description": "本地开发环境"}
    ]
)

app.include_router(auth_router)



def _extract_token_from_request(request: Request) -> str | None:
    auth_header = (request.headers.get("Authorization") or "").strip()
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    cookie_names = ("legal_auth_token", "access_token", "token")
    for cookie_name in cookie_names:
        token = (request.cookies.get(cookie_name) or "").strip()
        if token:
            return token

    return None


def _build_user_profile_from_payload(token_payload: dict[str, object]) -> dict[str, str | None]:
    email = str(token_payload.get("email") or "").strip() or None
    role = str(token_payload.get("role") or "user")
    user_id = str(token_payload.get("sub") or "").strip() or None
    name_from_payload = str(token_payload.get("name") or "").strip()

    if name_from_payload:
        display_name = name_from_payload
    elif email and "@" in email:
        display_name = email.split("@", 1)[0]
    else:
        display_name = "User"

    return {
        "id": user_id,
        "name": display_name,
        "email": email,
        "role": role,
    }


def _prune_expired_online_users(now: datetime) -> None:
    expired_ids = [
        user_id
        for user_id, last_seen in online_users_last_seen.items()
        if (now - last_seen).total_seconds() > ONLINE_TTL_SECONDS
    ]

    for user_id in expired_ids:
        online_users_last_seen.pop(user_id, None)
        online_users_profile.pop(user_id, None)


async def _refresh_presence_from_request(request: Request) -> dict[str, object]:
    token = _extract_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    token_payload = decode_access_token(token)
    profile = _build_user_profile_from_payload(token_payload)
    user_id = profile.get("id")

    if not user_id:
        raise HTTPException(status_code=401, detail="JWT payload missing subject")

    now = datetime.now(timezone.utc)

    async with online_users_lock:
        _prune_expired_online_users(now)
        online_users_last_seen[user_id] = now
        online_users_profile[user_id] = profile
        online_count = len(online_users_last_seen)

    return {
        "status": "success",
        "data": {
            "online_count": online_count,
            "user": profile,
            "ttl_seconds": ONLINE_TTL_SECONDS,
        },
        "msg": "presence updated",
    }


@app.get("/api/auth/session")
async def get_auth_session(request: Request):
    token = _extract_token_from_request(request)

    if not token:
        return {"user": None}

    token_payload = decode_access_token(token)
    profile = _build_user_profile_from_payload(token_payload)

    expires = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)

    return {
        "user": {
            "id": profile.get("id"),
            "name": profile.get("name"),
            "email": profile.get("email"),
            "role": profile.get("role"),
        },
        "expires": expires.isoformat(),
    }


@app.post("/api/presence/heartbeat")
async def presence_heartbeat(request: Request):
    return await _refresh_presence_from_request(request)


@app.get("/api/presence/online-count")
async def presence_online_count():
    now = datetime.now(timezone.utc)
    async with online_users_lock:
        _prune_expired_online_users(now)
        count = len(online_users_last_seen)

    return {
        "status": "success",
        "data": {"online_count": count, "ttl_seconds": ONLINE_TTL_SECONDS},
        "msg": "ok",
    }


@app.post("/api/presence/offline")
async def presence_offline(request: Request):
    token = _extract_token_from_request(request)
    if not token:
        return {"status": "success", "data": {"online_count": 0}, "msg": "no session"}

    try:
        token_payload = decode_access_token(token)
    except Exception:
        return {"status": "success", "data": {"online_count": 0}, "msg": "token invalid"}

    user_id = str(token_payload.get("sub") or "").strip()
    now = datetime.now(timezone.utc)

    async with online_users_lock:
        _prune_expired_online_users(now)
        if user_id:
            online_users_last_seen.pop(user_id, None)
            online_users_profile.pop(user_id, None)
        count = len(online_users_last_seen)

    return {
        "status": "success",
        "data": {"online_count": count},
        "msg": "offline marked",
    }


@app.exception_handler(AuthError)
async def handle_auth_error(_request: Request, exc: AuthError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "data": None, "msg": exc.msg},
    )


@app.exception_handler(ExpiredSignatureError)
async def handle_jwt_expired(_request: Request, _exc: ExpiredSignatureError):
    return JSONResponse(
        status_code=401,
        content={"status": "error", "data": None, "msg": "JWT 已过期"},
    )


@app.exception_handler(JWTError)
async def handle_jwt_error(_request: Request, _exc: JWTError):
    return JSONResponse(
        status_code=401,
        content={"status": "error", "data": None, "msg": "JWT 无效"},
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_request: Request, exc: RequestValidationError):
    errors = exc.errors()
    localized_errors: list[dict[str, object]] = []
    translated_errors: list[str] = []

    for error in errors:
        translated_message = _translate_validation_error(error)
        translated_errors.append(translated_message)
        localized_error = dict(error)
        localized_error["msg_en"] = str(error.get("msg") or "")
        localized_error["msg"] = translated_message
        localized_errors.append(localized_error)

    message = translated_errors[0] if translated_errors else "请求参数校验失败"

    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "data": {"errors": localized_errors},
            "msg": message,
        },
    )


@app.exception_handler(HTTPException)
async def handle_http_exception(_request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "data": None, "msg": str(exc.detail)},
    )


@app.exception_handler(Exception)
async def handle_unknown_exception(_request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"status": "error", "data": None, "msg": str(exc)},
    )

# ==========================================
# 定义前端传过来的数据格式 (数据校验层)
# ==========================================
class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]  # 仅允许 user / assistant
    content: str                           # 对应当前消息文本


class ChatRequest(BaseModel):
    query: str                                  # 用户当前的问题
    # 历史对话格式固定为:
    # [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    history: List[HistoryMessage] = Field(default_factory=list)

    # 开放给前端的"大厂级"配置开关 (带默认值)
    top_n: Optional[int] = Config.DEFAULT_TOP_N                 # 决定最后引用几条法条
    n_results: Optional[int] = Config.DEFAULT_N_RESULTS         # 决定向量海选捞多少条
    threshold: Optional[float] = Config.DEFAULT_THRESHOLD       # 决定过滤掉多少低分法条
    force_search: Optional[bool] = True                         # 是否强制开启检索（应对闲聊）
    stream: Optional[bool] = False                              # 是否启用 SSE 流式响应


class AuditResult(BaseModel):
    status: Literal["success", "need_clarify", "reject_non_legal", "rewrite"]
    issue: str = ""
    rule: str = ""
    application: str = ""
    conclusion: str = ""
    reason: Optional[str] = None


async def _call_maybe_async(func, *args, **kwargs):
    if inspect.iscoroutinefunction(func):
        return await func(*args, **kwargs)

    result = await asyncio.to_thread(func, *args, **kwargs)
    if inspect.iscoroutine(result):
        return await result

    return result


def _safe_parse_audit_result(raw_text: str) -> AuditResult | None:
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        extracted = _extract_first_json(raw_text)
        if not extracted:
            return None
        try:
            payload = json.loads(extracted)
        except json.JSONDecodeError:
            return None

    try:
        model_validate = getattr(AuditResult, "model_validate", None)
        if callable(model_validate):
            return model_validate(payload)
        return AuditResult.parse_obj(payload)
    except Exception:
        return None


def _extract_first_json(text: str) -> str | None:
    if not text:
        return None

    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False

    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    return None


def _default_clarify_answer() -> str:
    return "您的问题描述较为模糊。为了准确匹配法律依据，请补充具体细节（如：纠纷起因、涉及的金额或具体的合同类型）。"


def _build_answer_from_irac(audit: AuditResult) -> str:
    """Combine IRAC sections into a single markdown answer."""
    return (
        f"## 一、法律争点（Issue）\n{audit.issue}\n\n"
        f"## 二、法律规则（Rule）\n{audit.rule}\n\n"
        f"## 三、适用分析（Application）\n{audit.application}\n\n"
        f"## 四、结论（Conclusion）\n{audit.conclusion}"
    )


def _build_irac_dict(audit: AuditResult) -> dict:
    return {
        "issue": audit.issue,
        "rule": audit.rule,
        "application": audit.application,
        "conclusion": audit.conclusion,
    }

# ==========================================
# 核心对话接口
# ==========================================
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        print("\n" + "="*50)
        print(f"📥 [API接收请求] 用户提问: {req.query}")
        print(f"⚙️  [前端配置] top_n={req.top_n}, n_results={req.n_results}, 历史对话轮数={len(req.history)}")

        # 1. 意图重写
        search_query = await _call_maybe_async(
            rewrite_query,
            req.query,
            req.history,
            Config.RAG_MODEL,
        )
        if not search_query:
            search_query = req.query

        # 非法律意图初步拦截
        if "【非法律意图】" in search_query:
            print("🚫 判定：非法律问题，直接拒答")
            reject_payload = {
                "answer": "抱歉，我仅提供法律咨询服务，无法回答与法律无关的内容。",
                "references": [],
                "status": "reject_non_legal"
            }
            if req.stream:
                def reject_sse():
                    yield f"data: {json.dumps({'type': 'delta', 'content': reject_payload['answer']}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'done', 'references': [], 'status': 'reject_non_legal'}, ensure_ascii=False)}\n\n"
                    yield "[DONE]\n\n"
                return StreamingResponse(reject_sse(), media_type="text/event-stream")
            return reject_payload

        # 2. 意图预判 (继承你 main.py 里的逻辑)
        skip_words = ["总结", "记忆", "之前", "聊了什么", "你是谁"]
        should_skip_search = any(word in search_query for word in skip_words)

        # 如果前端强制关掉了检索，或者触发了闲聊词
        if not req.force_search or should_skip_search:
            print("🔀 [流转] 判定为闲聊或前端关闭检索，直接进入大模型回复。")
            answer = await _call_maybe_async(
                call_ollama_rag,
                req.query,
                [],
                req.history,
                Config.RAG_MODEL,
            )
            chitchat_payload = {
                "answer": answer,
                "references": [],
                "status": "success_no_search"
            }
            if req.stream:
                def chitchat_sse():
                    chunk_size = 4
                    for i in range(0, len(answer), chunk_size):
                        yield f"data: {json.dumps({'type': 'delta', 'content': answer[i:i+chunk_size]}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'done', 'references': [], 'status': 'success_no_search'}, ensure_ascii=False)}\n\n"
                    yield "[DONE]\n\n"
                return StreamingResponse(chitchat_sse(), media_type="text/event-stream")
            return chitchat_payload

        # 3. 混合检索
        raw_docs = await _call_maybe_async(
            run_search,
            search_query,
            Config.DB_PATH,
            Config.COLLECTION_NAME,
            Config.SEARCH_MODEL,
            req.n_results,
        )

        final_docs = []
        if raw_docs:
            # 4. 动态重排 (传入前端指定的 top_n 和 threshold)
            final_docs = await _call_maybe_async(
                rerank_context,
                search_query,
                raw_docs,
                Config.RERANK_MODEL,
                Config.DEFAULT_MAX_LENGTH,
                req.top_n,
                req.threshold,
            )

        # 无结果直接拒答
        if not final_docs:
            print("⚠️ 无匹配法条 → 低置信度拒答")
            low_conf_payload = {
                "answer": "❌ 未查询到相关法律依据，无法提供准确回答。请您描述更具体的法律问题。",
                "references": [],
                "status": "reject_low_confidence"
            }
            if req.stream:
                def low_conf_sse():
                    yield f"data: {json.dumps({'type': 'delta', 'content': low_conf_payload['answer']}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'done', 'references': [], 'status': 'reject_low_confidence'}, ensure_ascii=False)}\n\n"
                    yield "[DONE]\n\n"
                return StreamingResponse(low_conf_sse(), media_type="text/event-stream")
            return low_conf_payload

        # 5. 生成 + 审计合并为一次调用 (结构化 JSON 输出)
        laws_context_parts = []
        for i, d in enumerate(final_docs):
            meta = d['metadata']
            source = meta.get('source', '未知来源')
            article = meta.get('article_number', '')
            doc_type = meta.get('doc_type', 'law')
            type_label = {"law": "法律条文", "interpretation": "司法解释", "case": "指导案例"}.get(doc_type, "法律依据")
            laws_context_parts.append(
                f"【{i+1}】[{type_label}] 《{source}》{article}\n{d['content']}"
            )
        laws_context = "\n\n".join(laws_context_parts)

        audit_prompt = f"""
你是一名资深法律顾问兼审计员，采用IRAC法律分析方法。请基于【用户提问】和【法律依据】给出专业法律分析，并用严格 JSON 输出。
输出必须是单行 JSON，不要包含代码块或额外文本。

JSON 格式：
{{"status":"success|need_clarify|reject_non_legal|rewrite","issue":"...","rule":"...","application":"...","conclusion":"...","reason":"..."}}

规则：
1. 若用户问题与法律无关 -> status=reject_non_legal，所有IRAC字段填空字符串。
2. 若问题过于模糊且需要补充 -> status=need_clarify，issue/rule/application/conclusion填空，reason=澄清问题（<=300字）。
3. 若需要纠正/重写以严格匹配法律依据 -> status=rewrite。
4. 其他情况 -> status=success，完整填写所有IRAC字段。

【IRAC各字段要求】（每个字段使用Markdown格式）：

- issue: 明确指出用户问题中的核心法律争议点，1-2句话。
- rule: 列出适用的法律条文、司法解释和案例。格式：
  * 《法律名》第X条："..."
  * 司法解释：...
  * ⚠️ **案例参考**：引用【法律依据】中标记为[指导案例]的内容。说明案例的裁判要点与当前问题的关联性。如果检索结果中有案例，必须引用至少一个。
- application: 将法律规则与用户的具体情况进行分析：
  * 事实认定
  * 法律适用分析（结合法条+案例裁判逻辑）
  * 有利/不利因素分析
  * ⚠️ **案例对比**：与检索到的类似案例进行对比，说明相似之处和不同之处
- conclusion:
  * 明确的法律意见
  * 具体建议（结合案例中的裁判倾向）
  * 风险提示

reason 用一句话说明判断依据。

⚠️ *本回答仅供参考，不构成正式法律意见。具体法律问题请咨询专业执业律师。*

固定拒答话术："抱歉，我是一名法律助手，专注于法律咨询和依据查询。我无法为您提供烹饪、生活常识或其他非法律领域的建议。"

【用户提问】：{req.query}
【法律依据】：{laws_context}
"""

        raw_audit = await _call_maybe_async(
            call_ollama_rag,
            audit_prompt,
            [],
            req.history,
            Config.RAG_MODEL,
        )
        raw_audit = (raw_audit or "").strip()
        audit = _safe_parse_audit_result(raw_audit)

        if not audit:
            print("⚠️ 审计 JSON 解析失败，启用降级策略")
            if raw_audit:
                audit = AuditResult(
                    status="success",
                    issue="",
                    rule="",
                    application="",
                    conclusion=raw_audit,
                    reason="fallback_raw_text",
                )
            else:
                fallback = _default_clarify_answer()
                audit = AuditResult(
                    status="need_clarify",
                    issue="",
                    rule="",
                    application="",
                    conclusion=fallback,
                    reason="fallback_empty",
                )

        # Build combined markdown answer from IRAC sections
        if audit.issue or audit.rule or audit.application:
            combined_answer = _build_answer_from_irac(audit)
        else:
            combined_answer = audit.conclusion

        print("\n" + "-" * 30 + " 🤖 初始回答 " + "-" * 30)
        print(combined_answer)
        print(f"🧐 审计标签: {audit.status}")

        # -------------------- 逻辑分流处理 --------------------

        # 1. 识别回答中的"索要信息/反问"信号
        clarify_signals = ["了解更多信息", "提供以下信息", "具体内容", "描述不清晰", "请您提供", "具体情况是什么",
                           "什么类型", "具体事实"]
        model_is_asking = any(sig in combined_answer for sig in clarify_signals)

        # 2. 识别用户提问是否过短 (启发式：短于8个字通常需要更多背景)
        query_is_vague = len(req.query) < 8

        # 获取当前检索的最高分
        top_score = final_docs[0].get("rerank_score", -999)

        # 分支一：判定"非法律" (拒答)
        if audit.status == "reject_non_legal":
            print("🚫 二次审计：判定为非法律话题，执行拒答")
            reject_answer = "抱歉，我是一名法律助手，专注于法律咨询和依据查询。我无法为您提供烹饪、生活常识或其他非法律领域的建议。"
            if req.stream:
                def audit_reject_sse():
                    yield f"data: {json.dumps({'type': 'delta', 'content': reject_answer}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'done', 'references': [], 'status': 'reject_non_legal'}, ensure_ascii=False)}\n\n"
                    yield "[DONE]\n\n"
                return StreamingResponse(audit_reject_sse(), media_type="text/event-stream")
            return {"answer": reject_answer, "references": [], "status": "reject_non_legal"}

        # 分支二：判定"需澄清" (引导提问)
        # 逻辑：审计员判定需澄清 OR (模型在问问题 且 (用户问得太简单 或 匹配分数不高))
        if audit.status == "need_clarify" or (model_is_asking and (query_is_vague or top_score < 0.5)):
            print(f"🔍 综合判定：满足澄清条件 (标签: {audit.status}, 提问极短: {query_is_vague}, 得分: {top_score:.2f})")

            clarify_answer = combined_answer if len(combined_answer) < 300 else _default_clarify_answer()

            if req.stream:
                def clarify_sse():
                    yield f"data: {json.dumps({'type': 'delta', 'content': clarify_answer}, ensure_ascii=False)}\n\n"
                    yield f"data: {json.dumps({'type': 'done', 'references': [], 'status': 'need_clarify'}, ensure_ascii=False)}\n\n"
                    yield "[DONE]\n\n"
                return StreamingResponse(clarify_sse(), media_type="text/event-stream")
            return {"answer": clarify_answer, "references": [], "status": "need_clarify"}

        # 分支三：判定"不合格" (重写)
        if audit.status == "rewrite":
            print("⚠️ 审计判定回答需重写，已使用修正答案。")

        # 清理显存碎片 (继承自你原本的 main.py)
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        # 6. 组装发给前端的 JSON 数据
        # 格式化 references 方便前端直接渲染"溯源卡片"
        formatted_references = []
        for doc in final_docs:
            formatted_references.append({
                "source": doc['metadata'].get('source', '未知'),
                "article": doc['metadata'].get('article_number', '未知'),
                "content": doc['content'],
                "score": doc.get('rerank_score', 0),
                "hierarchy": {
                    "book": doc['metadata'].get('book', ''),
                    "chapter": doc['metadata'].get('chapter', ''),
                    "section": doc['metadata'].get('section', ''),
                },
                "doc_type": doc['metadata'].get('doc_type', 'law'),
                "method": doc.get('method', '未知'),
            })

        print("📤 [API返回响应] 成功生成回答并附带溯源信息。")
        print("="*50 + "\n")

        irac_data = _build_irac_dict(audit)

        response_payload = {
            "answer": combined_answer,
            "irac": irac_data,
            "references": formatted_references,
            "status": "success",
            "metadata": {
                "query_rewrite": search_query,
                "top_score": final_docs[0].get("rerank_score", 0) if final_docs else 0,
                "doc_count": len(final_docs),
            }
        }

        # SSE 流式响应
        if req.stream:
            def sse_generator():
                # 逐字符发送 answer 内容
                chunk_size = 4
                for i in range(0, len(combined_answer), chunk_size):
                    chunk = combined_answer[i:i + chunk_size]
                    yield f"data: {json.dumps({'type': 'delta', 'content': chunk}, ensure_ascii=False)}\n\n"

                # 最后发送完整的 references, irac 和 metadata
                yield f"data: {json.dumps({'type': 'done', 'references': formatted_references, 'irac': irac_data, 'status': 'success', 'metadata': response_payload['metadata']}, ensure_ascii=False)}\n\n"
                yield "[DONE]\n\n"

            return StreamingResponse(
                sse_generator(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )

        # 标准 JSON 响应
        return response_payload

    except Exception as e:
        print(f"❌ [API运行错误]: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



required_origins = [
    "https://rag-legal.pages.dev",
    "https://register.rag-legal.pages.dev",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://rag-legal-jet.vercel.app",
    "https://rag-legal-git-main-hehe051104s-projects.vercel.app",
    "https://rag-legal-git-chatbot-hehe051104s-projects.vercel.app",
]

extra_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

# 合并名单
allowed_origins = required_origins + extra_origins

# 官方推荐的 CORS 终极解法
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,     # 允许前端携带 Cookie (认证必须)
    allow_methods=["*"],        # 允许所有方法 (自动完美处理 OPTIONS)
    allow_headers=["*"],        # 允许所有请求头
)

if __name__ == "__main__":
    # 启动服务器，对外暴露 8000 端口
    print("🚀 法律智能体 API 服务已启动！")
    print("👉 请在浏览器中打开调试台: http://127.0.0.1:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)