from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..dependencies import get_current_user, require_tenant_member
from ..errors import AppError

router = APIRouter(prefix="/tables", tags=["tables"])

OWNER = ("tenant_owner",)


class TableCodeIn(BaseModel):
    code: str = Field(min_length=2, max_length=32, pattern=r"^[A-Za-z0-9-]+$")


class TableCodeOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    code: str


@router.get("", response_model=list[TableCodeOut])
def list_tables(user_tenant=Depends(get_current_user), db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, OWNER)
    rows = db.scalars(select(models.TableCode).where(
        models.TableCode.tenant_id == user.tenant_id)).all()
    return [TableCodeOut(id=r.id, code=r.code) for r in rows]


@router.post("", response_model=TableCodeOut, status_code=201)
def create_table(body: TableCodeIn, user_tenant=Depends(get_current_user),
                 db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, OWNER)
    exists = db.scalar(select(models.TableCode).where(
        models.TableCode.tenant_id == user.tenant_id, models.TableCode.code == body.code))
    if exists:
        raise AppError(409, "conflict", "Kode meja sudah ada.")
    row = models.TableCode(tenant_id=user.tenant_id, code=body.code)
    db.add(row)
    db.commit()
    db.refresh(row)
    return TableCodeOut(id=row.id, code=row.code)
