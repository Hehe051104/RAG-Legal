from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, VerificationCode
from utils import generate_6_digit_code, hash_password, send_verification_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SendCodeRequest(BaseModel):
    email: EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=6, max_length=128)
    username: str = Field(min_length=2, max_length=50)


@router.post("/send-code")
async def send_code(payload: SendCodeRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower().strip()

    existing_user = await db.scalar(select(User).where(User.email == email))
    if existing_user and existing_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该邮箱已完成注册",
        )

    code = generate_6_digit_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db.execute(delete(VerificationCode).where(VerificationCode.email == email))
    db.add(VerificationCode(email=email, code=code, expires_at=expires_at))
    await db.commit()

    await send_verification_email(to_email=email, code=code)

    return {"message": "验证码已发送", "expires_in_minutes": 10}


@router.post("/register")
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower().strip()
    now = datetime.now(timezone.utc)

    existing_user = await db.scalar(select(User).where(User.email == email))
    if existing_user and existing_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该邮箱已注册",
        )

    code_record = await db.scalar(
        select(VerificationCode)
        .where(
            VerificationCode.email == email,
            VerificationCode.code == payload.code,
            VerificationCode.expires_at > now,
        )
        .order_by(VerificationCode.id.desc())
    )

    if not code_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="验证码错误或已过期",
        )

    password_hash = hash_password(payload.password)

    if existing_user:
        existing_user.username = payload.username
        existing_user.password_hash = password_hash
        existing_user.provider = "local"
        existing_user.is_verified = True
        existing_user.updated_at = now
        user = existing_user
    else:
        user = User(
            email=email,
            username=payload.username,
            password_hash=password_hash,
            provider="local",
            is_verified=True,
        )
        db.add(user)

    await db.execute(delete(VerificationCode).where(VerificationCode.email == email))
    await db.commit()
    await db.refresh(user)

    return {
        "message": "注册成功",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "provider": user.provider,
            "is_verified": user.is_verified,
            "tier": user.tier,
        },
    }
