from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..cache import menu_cache
from ..db import get_db
from ..dependencies import asset_url
from ..errors import AppError
from ..schemas import PublicEventIn, PublicItemOut, PublicMenuOut

router = APIRouter(prefix="/public", tags=["public"])


def _slug_or_404(db: Session, slug: str) -> models.Tenant:
    tenant = db.scalar(select(models.Tenant).where(models.Tenant.slug == slug))
    if tenant is None:
        raise AppError(404, "not_found", "Menu tidak ditemukan.")
    return tenant


def _out(item: models.MenuItem) -> PublicItemOut:
    out = PublicItemOut.model_validate(item)
    out.image_url = asset_url(item.image_key)
    out.glb_url = asset_url(item.glb_key)
    return out


@router.get("/{slug}/menu", response_model=PublicMenuOut)
def public_menu(slug: str, table: str | None = None, db: Session = Depends(get_db)):
    tenant = _slug_or_404(db, slug)
    from typing import cast

    cached: list[models.MenuItem] | None = cast(list[models.MenuItem] | None,
                                                    menu_cache.get(slug))
    if cached is None:
        cached = list(db.scalars(
            select(models.MenuItem).where(models.MenuItem.tenant_id == tenant.id)
            .order_by(models.MenuItem.category, models.MenuItem.name)
        ).all())
        menu_cache.set(slug, cached)
    # Semua item dikembalikan; is_available memandu UI (badge "Habis")
    items = [_out(i) for i in cached]
    return PublicMenuOut(tenant_name=tenant.name, table=table, items=items)


@router.get("/{slug}/menu/{item_id}", response_model=PublicItemOut)
def public_menu_item(slug: str, item_id: int, db: Session = Depends(get_db)):
    tenant = _slug_or_404(db, slug)
    item = db.scalar(
        select(models.MenuItem).where(
            models.MenuItem.id == item_id, models.MenuItem.tenant_id == tenant.id
        )
    )
    if item is None:
        raise AppError(404, "not_found", "Item tidak ditemukan.")
    return _out(item)


@router.post("/events", status_code=202)
def public_events(body: PublicEventIn, request: Request,
                  db: Session = Depends(get_db)):
    tenant = _slug_or_404(db, body.slug)
    exists = db.scalar(
        select(models.MenuItem.id).where(
            models.MenuItem.id == body.menu_item_id,
            models.MenuItem.tenant_id == tenant.id,
        )
    )
    if exists is None:
        return Response(status_code=204)  # tanpa PII, tanpa bocorkan adm
    db.add(models.ViewEvent(tenant_id=tenant.id, menu_item_id=body.menu_item_id,
                            ar_launched=body.ar_launched))
    db.commit()
    return Response(status_code=202)
