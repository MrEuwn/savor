import hashlib

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .errors import AppError
from .models import ApiKey, Tenant, User
from .security import decode_access_token


def get_current_user(request: Request, db: Session = Depends(get_db)) -> tuple[User, Tenant]:
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        raise AppError(401, "unauthorized", "Token dibutuhkan.")
    payload = decode_access_token(auth[7:].strip())
    user = db.get(User, payload["sub"].removeprefix("access:"))
    if user is None:
        raise AppError(401, "unauthorized", "Pengguna tidak ditemukan.")
    tenant = db.get(Tenant, payload["tenant_id"])
    if tenant is None:
        raise AppError(401, "unauthorized", "Tenant tidak ditemukan.")
    return user, tenant


def require_tenant_member(user_tenant: tuple[User, Tenant], roles: tuple[str, ...]) -> User:
    user, _tenant = user_tenant
    if user.role not in roles:
        raise AppError(403, "forbidden", "Anda tidak berwenang.")
    return user


def get_pos_tenant(request: Request, db: Session = Depends(get_db)) -> Tenant:
    raw = request.headers.get("X-MejaAR-Key", "")
    if not raw:
        raise AppError(401, "unauthorized", "API key dibutuhkan (header X-MejaAR-Key).")
    digest = hashlib.sha256(raw.encode()).hexdigest()
    key = db.query(ApiKey).filter(ApiKey.key_hash == digest, ApiKey.revoked_at.is_(None)).first()
    if key is None:
        raise AppError(401, "unauthorized", "API key tidak valid.")
    from .models import utcnow

    key.last_used_at = utcnow()
    db.commit()
    tenant = db.get(Tenant, key.tenant_id)
    if tenant is None:
        raise AppError(500, "internal", "Tenant API key tidak ditemukan.")
    return tenant


def asset_url(key: str | None) -> str | None:
    if not key:
        return None
    if settings.storage_backend == "s3" and settings.s3_public_base_url:
        return f"{settings.s3_public_base_url.rstrip('/')}/{key}"
    # ponytail: URL relatif /assets/<key> — tampil via origin mana pun
    # (Next rewrite men-proxy ke backend). Tidak bergantung IP/tunnel.
    # Upgrade: S3/CDN untuk aset publik publik.
    return f"/assets/{key}"
