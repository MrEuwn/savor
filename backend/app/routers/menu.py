from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..dependencies import asset_url, get_current_user, require_tenant_member
from ..errors import AppError
from ..schemas import AssetUploadOut, MenuItemIn, MenuItemOut, MenuItemPatch
from ..storage import save_asset

router = APIRouter(prefix="/menu-items", tags=["menu"])

MEMBER = ("tenant_owner", "tenant_staff")


def _get_item(db: Session, tenant_id: int, item_id: int) -> models.MenuItem:
    item = db.scalar(
        select(models.MenuItem).where(
            models.MenuItem.id == item_id, models.MenuItem.tenant_id == tenant_id
        )
    )
    if item is None:
        raise AppError(404, "not_found", "Item tidak ditemukan.")
    return item


def _out(item: models.MenuItem) -> MenuItemOut:
    out = MenuItemOut.model_validate(item)
    out.image_url = asset_url(item.image_key)
    out.glb_url = asset_url(item.glb_key)
    return out


@router.get("", response_model=list[MenuItemOut])
def list_items(user_tenant=Depends(get_current_user), db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, MEMBER)
    items = db.scalars(
        select(models.MenuItem).where(models.MenuItem.tenant_id == user.tenant_id)
        .order_by(models.MenuItem.created_at)
    ).all()
    return [_out(i) for i in items]


@router.post("", response_model=MenuItemOut, status_code=201)
def create_item(body: MenuItemIn, user_tenant=Depends(get_current_user),
                db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, MEMBER)
    if body.external_id and db.scalar(
        select(models.MenuItem).where(
            models.MenuItem.tenant_id == user.tenant_id,
            models.MenuItem.external_id == body.external_id,
        )
    ):
        raise AppError(409, "conflict", "external_id sudah dipakai di tenant ini.")
    item = models.MenuItem(tenant_id=user.tenant_id, **body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _out(item)


@router.get("/{item_id}", response_model=MenuItemOut)
def get_item(item_id: int, user_tenant=Depends(get_current_user),
             db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, MEMBER)
    return _out(_get_item(db, user.tenant_id, item_id))


@router.patch("/{item_id}", response_model=MenuItemOut)
def patch_item(item_id: int, body: MenuItemPatch, user_tenant=Depends(get_current_user),
               db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, MEMBER)
    item = _get_item(db, user.tenant_id, item_id)
    data = body.model_dump(exclude_unset=True)
    if "calories_kcal" in data and data["calories_kcal"] is None:
        data.pop("calories_kcal")  # None tidak boleh mengosongkan field opsional
    for key, value in data.items():
        setattr(item, key, value)
    from .. import cache as cache_mod

    cache_mod.menu_cache.clear_slug(user_tenant[1].slug)
    db.commit()
    db.refresh(item)
    return _out(item)


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, user_tenant=Depends(get_current_user),
                db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, MEMBER)
    item = _get_item(db, user.tenant_id, item_id)
    from .. import cache as cache_mod

    cache_mod.menu_cache.clear_slug(user_tenant[1].slug)
    db.delete(item)
    db.commit()


@router.post("/{item_id}/assets", response_model=AssetUploadOut)
async def upload_asset(item_id: int, kind: str = Form(...),
                       file: UploadFile = File(...),
                       user_tenant=Depends(get_current_user),
                       db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, MEMBER)
    item = _get_item(db, user.tenant_id, item_id)
    data = await file.read()
    if not data:
        raise AppError(400, "bad_request", "File kosong.")
    key = save_asset(user.tenant_id, kind, file.filename or "asset", data)
    if kind == "image":
        item.image_key = key
    else:
        item.glb_key = key
    item.status = "ready"
    db.commit()
    return AssetUploadOut(image_url=asset_url(item.image_key),
                          glb_url=asset_url(item.glb_key), status="ready")
