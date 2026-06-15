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
import asyncio
import re
from pathlib import Path
from uuid import uuid4
import tempfile
import edge_tts
import whisper

"""
新增函数：
"""
UPLOAD_ROOT = Path(os.getenv("UPLOAD_ROOT", "uploads")).resolve()
EXTRACT_TEXT_LIMIT = 30000

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".pdf", ".doc", ".docx", ".txt", ".md",
}


def _safe_filename(filename: str) -> str:
    filename = filename or "unknown"
    filename = filename.replace("\\", "_").replace("/", "_")
    filename = re.sub(r"[\r\n\t]", "_", filename)
    return filename[:120]


def _get_file_kind(ext: str, content_type: str) -> str:
    if content_type.startswith("image/") or ext in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
        return "image"
    return "document"


async def _save_upload_file(file: UploadFile, user_id: str) -> tuple[Path, str, int]:
    original_filename = _safe_filename(file.filename or "unknown")
    ext = Path(original_filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件后缀: {ext}。支持: jpg/png/gif/webp/pdf/doc/docx/txt/md",
        )

    user_dir = UPLOAD_ROOT / user_id
    user_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid4().hex}{ext}"
    saved_path = user_dir / stored_name

    total_size = 0
    with saved_path.open("wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break

            total_size += len(chunk)
            if total_size > MAX_UPLOAD_SIZE_BYTES:
                saved_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=400,
                    detail=f"文件大小超过限制（最大 {MAX_UPLOAD_SIZE_BYTES // 1024 // 1024}MB）",
                )

            f.write(chunk)

    return saved_path, original_filename, total_size

def _extract_text_from_image(path: Path) -> str:
    """从图片中提取文字（Tesseract OCR）"""
    try:
        from PIL import Image
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        img = Image.open(str(path))
        text = pytesseract.image_to_string(img, lang="chi_sim+eng")
        return text.strip()[:EXTRACT_TEXT_LIMIT]
    except Exception as e:
        return f"图片文字识别失败：{str(e)}"

def _extract_text_from_file(path: Path, ext: str) -> str:
    try:
        if ext in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
            return _extract_text_from_image(path)  #OCR提取文字

        if ext in {".txt", ".md"}:
            try:
                return path.read_text(encoding="utf-8")[:EXTRACT_TEXT_LIMIT]
            except UnicodeDecodeError:
                return path.read_text(encoding="gb18030", errors="ignore")[:EXTRACT_TEXT_LIMIT]

        if ext == ".docx":
            from docx import Document

            doc = Document(str(path))
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            return "\n".join(paragraphs)[:EXTRACT_TEXT_LIMIT]

        if ext == ".pdf":
            from pypdf import PdfReader

            reader = PdfReader(str(path))
            pages = []
            for page in reader.pages:
                text = page.extract_text() or ""
                if text.strip():
                    pages.append(text.strip())
            return "\n\n".join(pages)[:EXTRACT_TEXT_LIMIT]

        if ext == ".doc":
            return "该文件为旧版 .doc 格式，当前仅保存文件，暂不支持自动提取文本。建议转换为 .docx 后上传。"

        return ""

    except Exception as e:
        return f"文件已上传，但文本解析失败：{str(e)}"


"""结束"""









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
    支持图片 jpeg/png/gif/webp 和文档 pdf/doc/docx/txt/md，最大 10MB。
    文档会尽量提取文本，供后续大模型分析使用。
    """
    user = _verify_user(request)

    content_type = file.content_type or ""
    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {ext or content_type}。支持: 图片(jpg/png/gif/webp)、文档(pdf/doc/docx/txt/md)",
        )

    saved_path, original_filename, size = await _save_upload_file(file, user["id"])

    kind = _get_file_kind(ext, content_type)

    extracted_text = ""
    if kind == "document":
        extracted_text = await asyncio.to_thread(_extract_text_from_file, saved_path, ext)
    elif kind == "image":
        extracted_text = await asyncio.to_thread(_extract_text_from_image, saved_path)

    relative_url = f"/uploads/{user['id']}/{saved_path.name}"

    print(
        f"📤 [上传] 用户={user['id']} 文件={original_filename} "
        f"大小={size}B 类型={content_type} 保存={saved_path}"
    )

    return MultimodalResponse(
        data={
            "file_id": saved_path.stem,
            "url": relative_url,
            "filename": original_filename,
            "stored_name": saved_path.name,
            "size": size,
            "content_type": content_type,
            "kind": kind,
            "text": extracted_text,
            "text_preview": extracted_text[:1000] if extracted_text else "",
            "text_length": len(extracted_text),
            "can_analyze": bool(extracted_text.strip()),
        },
        msg="文件上传成功",
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
