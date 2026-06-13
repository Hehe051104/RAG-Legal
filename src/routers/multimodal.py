"""
多模态接口路由 — 文件上传、语音转文本、文本转语音

所有接口使用统一用户 Token 鉴权（与 auth.py 一致），不引入多角色逻辑。
当前为 Mock 实现，返回占位数据，留 TODO 供后续接入真实服务。
"""

import os
from typing import Any

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from jose import ExpiredSignatureError, JWTError
from pydantic import BaseModel, Field

from routers.auth import decode_access_token

router = APIRouter(prefix="/api", tags=["multimodal"])

# ---------- 常量 ----------

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOC_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}

# ---------- 工具函数 ----------


def _extract_token(request: Request) -> str:
    """从请求中提取 JWT Token，复用 api_server.py 的同款逻辑。"""
    auth_header = (request.headers.get("Authorization") or "").strip()
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if token:
            return token

    for cookie_name in ("legal_auth_token", "access_token", "token"):
        token = (request.cookies.get(cookie_name) or "").strip()
        if token:
            return token

    raise HTTPException(status_code=401, detail="未登录或 Token 已过期")


def _verify_user(request: Request) -> dict[str, Any]:
    """验证 Token 并返回用户信息（统一用户架构，不分角色）。"""
    token = _extract_token(request)
    try:
        payload = decode_access_token(token)
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已过期，请重新登录")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token 无效")

    user_id = str(payload.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Token 中缺少用户标识")

    return {
        "id": user_id,
        "email": payload.get("email"),
        "role": payload.get("role", "user"),
    }


# ---------- 响应模型 ----------


class MultimodalResponse(BaseModel):
    status: str = "success"
    data: dict[str, Any] = {}
    msg: str = "ok"


# ---------- 接口 ----------


@router.post("/upload", response_model=MultimodalResponse)
async def upload_file(request: Request, file: UploadFile = File(...)):
    """
    文件/图片上传接口

    接受 multipart/form-data，字段名 "file"。
    支持图片（jpeg/png/gif/webp）和文档（pdf/doc/docx/txt），最大 10MB。
    """
    user = _verify_user(request)

    # 校验文件类型
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {content_type}。支持: 图片(jpeg/png/gif/webp)、文档(pdf/doc/docx/txt)",
        )

    # 读取并校验大小
    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"文件大小超过限制（最大 {MAX_UPLOAD_SIZE_BYTES // 1024 // 1024}MB）",
        )

    # TODO: 接入真实文件存储（本地 /uploads 目录、OSS、S3 等）
    # 当前返回 Mock 数据
    filename = file.filename or "unknown"
    saved_path = f"/uploads/{user['id']}_{filename}"

    print(f"📤 [上传] 用户={user['id']} 文件={filename} 大小={len(file_bytes)}B 类型={content_type}")

    return MultimodalResponse(
        data={
            "url": saved_path,
            "filename": filename,
            "size": len(file_bytes),
            "content_type": content_type,
        },
        msg="文件上传成功（Mock）",
    )


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="要转换为语音的文本")


@router.post("/speech/synthesize", response_model=MultimodalResponse)
async def synthesize_speech(request: Request, body: SynthesizeRequest):
    """
    文本转语音接口 (TTS)

    接受 JSON body: {"text": "..."}
    返回音频文件的 URL（当前为 Mock）。
    """
    user = _verify_user(request)

    # TODO: 接入真实 TTS 服务（Edge TTS、OpenAI TTS、Azure Speech 等）
    # 当前返回 Mock 数据
    print(f"🔊 [TTS] 用户={user['id']} 文本长度={len(body.text)}")

    return MultimodalResponse(
        data={
            "audio_url": f"/audio/{user['id']}_tts.mp3",
            "text_length": len(body.text),
            "format": "mp3",
        },
        msg="语音合成成功（Mock）",
    )


@router.post("/speech/transcriptions", response_model=MultimodalResponse)
async def transcribe_audio(request: Request, audio: UploadFile = File(...)):
    """
    音频转文本接口 (STT)

    接受 multipart/form-data，字段名 "audio"。
    支持常见音频格式（wav/mp3/m4a/webm）。
    """
    user = _verify_user(request)

    # 基本校验
    content_type = audio.content_type or ""
    if not content_type.startswith("audio/") and content_type not in {
        "application/octet-stream",
        "video/webm",  # 浏览器 MediaRecorder 默认格式
    }:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的音频类型: {content_type}。请上传 wav/mp3/m4a/webm 格式。",
        )

    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"音频大小超过限制（最大 {MAX_UPLOAD_SIZE_BYTES // 1024 // 1024}MB）",
        )

    # TODO: 接入真实 STT 服务（Whisper、Azure Speech、讯飞等）
    # 当前返回 Mock 数据
    print(f"🎤 [STT] 用户={user['id']} 音频大小={len(audio_bytes)}B 类型={content_type}")

    return MultimodalResponse(
        data={
            "text": "（Mock）这是语音识别的占位文本，后续接入 Whisper 等 STT 服务后将返回真实转录结果。",
            "duration_seconds": round(len(audio_bytes) / 32000, 1),  # 粗略估算
            "language": "zh",
        },
        msg="语音转录成功（Mock）",
    )
