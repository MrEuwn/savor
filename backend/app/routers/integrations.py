from __future__ import annotations

import hashlib
import secrets

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..dependencies import get_current_user, require_tenant_member
from ..errors import AppError
from ..schemas import ApiKeyCreated, ApiKeyIn, ApiKeyOut, WebhookIn, WebhookOut

router = APIRouter(prefix="/integrations", tags=["integrations"])

OWNER = ("tenant_owner",)


@router.post("/api-keys", response_model=ApiKeyCreated, status_code=201)
def create_api_key(body: ApiKeyIn, user_tenant=Depends(get_current_user),
                   db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, OWNER)
    raw = "mk_mat_" + secrets.token_urlsafe(24)
    row = models.ApiKey(
        tenant_id=user.tenant_id,
        key_hash=hashlib.sha256(raw.encode()).hexdigest(),
        label=body.label,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ApiKeyCreated(id=row.id, label=row.label, last_used_at=None,
                         revoked_at=None, key=raw)


@router.get("/api-keys", response_model=list[ApiKeyOut])
def list_api_keys(user_tenant=Depends(get_current_user), db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, OWNER)
    rows = db.scalars(select(models.ApiKey).where(
        models.ApiKey.tenant_id == user.tenant_id)).all()
    return [ApiKeyOut(id=r.id, label=r.label, last_used_at=r.last_used_at,
                      revoked_at=r.revoked_at) for r in rows]


@router.delete("/api-keys/{key_id}", status_code=204)
def revoke_api_key(key_id: int, user_tenant=Depends(get_current_user),
                   db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, OWNER)
    row = db.scalar(select(models.ApiKey).where(
        models.ApiKey.id == key_id, models.ApiKey.tenant_id == user.tenant_id))
    if row is None:
        raise AppError(404, "not_found", "API key tidak ditemukan.")
    if row.revoked_at is None:
        from ..models import utcnow

        row.revoked_at = utcnow()
    db.commit()


@router.post("/webhooks", response_model=WebhookOut, status_code=201)
def create_webhook(body: WebhookIn, user_tenant=Depends(get_current_user),
                   db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, OWNER)
    row = models.WebhookEndpoint(tenant_id=user.tenant_id, url=body.url,
                                 secret_key=body.secret, events=body.events)
    db.add(row)
    db.commit()
    db.refresh(row)
    return WebhookOut(id=row.id, url=row.url, secret=row.secret_key, events=row.events)


@router.get("/webhooks", response_model=list[WebhookOut])
def list_webhooks(user_tenant=Depends(get_current_user), db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, OWNER)
    rows = db.scalars(select(models.WebhookEndpoint).where(
        models.WebhookEndpoint.tenant_id == user.tenant_id)).all()
    return [WebhookOut(id=r.id, url=r.url, secret=r.secret_key, events=r.events)
            for r in rows]
