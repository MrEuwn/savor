from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from starlette.responses import JSONResponse

    from .models import User

from jose import JWTError, jwt
from slowapi.errors import RateLimitExceeded

from .config import settings
from .errors import AppError

roster = {
    "platform_admin": {"platform_admin", "tenant_owner", "tenant_staff"},
    "tenant_owner": {"tenant_owner", "tenant_staff"},
    "tenant_staff": {"tenant_staff"},
}


def hash_password(plain: str) -> str:
    from argon2 import PasswordHasher

    return PasswordHasher().hash(plain)


def verify_password(plain: str, stored: str) -> bool:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError

    try:
        return PasswordHasher().verify(stored, plain)
    except VerifyMismatchError:
        return False


def _make(token_id: str, user: User, tenant_id: int, kind: str, ttl: timedelta) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": f"{kind}:{user.id}",
        "tenant_id": tenant_id,
        "role": user.role,
        "jti": token_id,
        "type": kind,
        "iat": int(now.timestamp()),
        "exp": now + ttl,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def make_access_token(user, tenant_id: int) -> str:
    return _make(uuid.uuid4().hex, user, tenant_id, "access",
                 timedelta(minutes=settings.jwt_access_ttl_minutes))


def make_refresh_token(user, tenant_id: int) -> tuple[str, str]:
    jti = uuid.uuid4().hex
    return jti, _make(jti, user, tenant_id, "refresh",
                      timedelta(days=settings.jwt_refresh_ttl_days))


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as e:
        raise AppError(401, "unauthorized", "Token tidak valid atau kedaluwarsa.") from e
    if payload.get("type") != "access":
        raise AppError(401, "unauthorized", "Jenis token salah.")
    return payload


def require_role(*roles: str):
    def outer(payload_from_token, user):
        if payload_from_token.get("role") not in roles:
            raise AppError(403, "forbidden", "Anda tidak berwenang.")
    return outer


def rate_limit_error_handler(request, exc: RateLimitExceeded) -> JSONResponse:
    from starlette.responses import JSONResponse

    return JSONResponse(
        status_code=429,
        content={"error": {"code": "rate_limited", "message": "Terlalu banyak permintaan. Coba lagi nanti."}},
    )
