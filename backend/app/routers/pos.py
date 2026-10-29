from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import cache as cache_mod
from .. import models
from ..db import get_db
from ..dependencies import get_pos_tenant
from ..errors import AppError
from ..schemas import PosAvailabilityIn, PosMenuSyncIn

router = APIRouter(prefix="/pos", tags=["pos"])


@router.post("/menu-sync", response_model=dict)
def menu_sync(body: PosMenuSyncIn, tenant: models.Tenant = Depends(get_pos_tenant),
              db: Session = Depends(get_db)):
    seen = 0
    for entry in body.items:
        item = db.scalar(
            select(models.MenuItem).where(
                models.MenuItem.external_id == entry.external_id,
                models.MenuItem.tenant_id == tenant.id,
            )
        )
        if item is None:
            item = models.MenuItem(tenant_id=tenant.id, external_id=entry.external_id)
            db.add(item)
        item.name = entry.name
        item.description = entry.description
        item.price = entry.price
        item.category = entry.category
        item.is_available = entry.is_available
        if item.status in ("draft", "failed"):
            item.status = "ready" if (item.image_key or item.glb_key) else item.status
        seen += 1
    db.commit()
    cache_mod.menu_cache.clear_slug(tenant.slug)
    return {"upserted": seen}


@router.patch("/items/{external_id}/availability", response_model=dict)
def set_availability(external_id: str, body: PosAvailabilityIn,
                     tenant: models.Tenant = Depends(get_pos_tenant),
                     db: Session = Depends(get_db)):
    item = db.scalar(
        select(models.MenuItem).where(
            models.MenuItem.external_id == external_id,
            models.MenuItem.tenant_id == tenant.id,
        )
    )
    if item is None:
        raise AppError(404, "not_found", "external_id tidak dikenal untuk tenant ini.")
    item.is_available = body.is_available
    db.commit()
    cache_mod.menu_cache.clear_slug(tenant.slug)
    return {"external_id": external_id, "is_available": body.is_available}
