from __future__ import annotations

import re
from datetime import timedelta

from fastapi import APIRouter, Depends
from jose import jwt
from jose.exceptions import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from ..db import get_db
from ..errors import AppError
from ..schemas import AuthOut, LoginIn, RefreshIn, RegisterTenantIn, TenantOut
from ..security import (
    hash_password,
    make_access_token,
    make_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _slugify(name: str, fallback: str) -> str:
    import unicodedata

    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:60] or fallback


def _issue_tokens(tenant: models.Tenant, user: models.User, db: Session) -> tuple[str, str]:
    jti, refresh = make_refresh_token(user, tenant.id)
    db.add(models.RefreshToken(
        jti=jti, user_id=user.id,
        expires_at=models.utcnow() + timedelta(days=settings.jwt_refresh_ttl_days),
    ))
    db.flush()
    return make_access_token(user, tenant.id), refresh


def _auth_out(access: str, refresh: str, tenant: models.Tenant, user: models.User) -> AuthOut:
    return AuthOut(
        access_token=access, refresh_token=refresh,
        tenant=TenantOut(id=tenant.id, slug=tenant.slug, name=tenant.name), role=user.role,
    )


@router.post("/register-tenant", response_model=AuthOut, status_code=201)
def register_tenant(body: RegisterTenantIn, db: Session = Depends(get_db)) -> AuthOut:
    email = body.email.lower()
    if db.scalar(select(models.User).where(models.User.email == email)):
        raise AppError(409, "conflict", "Email sudah terdaftar.")
    base_slug = body.slug or _slugify(body.name, "restoran")
    slug, n = base_slug, 1
    while db.scalar(select(models.Tenant).where(models.Tenant.slug == slug)):
        n += 1
        slug = f"{base_slug}-{n}"
    tenant = models.Tenant(name=body.name, slug=slug)
    db.add(tenant)
    db.flush()
    user = models.User(tenant_id=tenant.id, email=email,
                       password_hash=hash_password(body.password), role="tenant_owner")
    db.add(user)
    db.flush()
    access, refresh = _issue_tokens(tenant, user, db)
    db.commit()
    return _auth_out(access, refresh, tenant, user)


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> AuthOut:
    user = db.scalar(select(models.User).where(models.User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise AppError(401, "unauthorized", "Email atau password salah.")
    tenant = db.get(models.Tenant, user.tenant_id)
    if tenant is None:
        raise AppError(500, "internal", "Tenant tidak ditemukan.")
    access, refresh = _issue_tokens(tenant, user, db)
    db.commit()
    return _auth_out(access, refresh, tenant, user)


@router.post("/refresh", response_model=AuthOut)
def refresh(body: RefreshIn, db: Session = Depends(get_db)) -> AuthOut:
    try:
        payload = jwt.decode(body.refresh_token, settings.jwt_secret,
                             algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise AppError(401, "unauthorized",
                       "Refresh token tidak valid atau kedaluwarsa.") from None
    if payload.get("type") != "refresh":
        raise AppError(401, "unauthorized", "Jenis token salah.")
    user = db.get(models.User, payload["sub"].removeprefix("refresh:"))
    if user is None:
        raise AppError(401, "unauthorized", "Pengguna tidak ditemukan.")
    stored = db.scalar(select(models.RefreshToken).where(models.RefreshToken.jti == payload.get("jti")))
    if stored is None or stored.revoked or stored.user_id != user.id:
        raise AppError(401, "unauthorized", "Refresh token tidak valid (rotasi).")
    stored.revoked = True  # rotasi: token lama dibatalkan
    tenant = db.get(models.Tenant, user.tenant_id)
    if tenant is None:
        raise AppError(500, "internal", "Tenant tidak ditemukan.")
    access, refresh = _issue_tokens(tenant, user, db)
    db.commit()
    return _auth_out(access, refresh, tenant, user)
