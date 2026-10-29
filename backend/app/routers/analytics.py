from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from .. import models
from ..db import get_db
from ..dependencies import get_current_user, require_tenant_member
from ..schemas import AnalyticsSummary, PerItemStat

router = APIRouter(prefix="/analytics", tags=["analytics"])

OWNER = ("tenant_owner",)


@router.get("/summary", response_model=AnalyticsSummary)
def summary(user_tenant=Depends(get_current_user), db: Session = Depends(get_db)):
    user = require_tenant_member(user_tenant, OWNER)
    tenant_id = user.tenant_id
    total = db.scalar(select(func.count(models.ViewEvent.id)).where(
        models.ViewEvent.tenant_id == tenant_id)) or 0
    ar = db.scalar(select(func.count(models.ViewEvent.id)).where(
        models.ViewEvent.tenant_id == tenant_id, models.ViewEvent.ar_launched.is_(True))) or 0
    rows = db.execute(
        select(models.MenuItem.id, models.MenuItem.name,
               func.count(models.ViewEvent.id),
               func.sum(case((models.ViewEvent.ar_launched.is_(True), 1), else_=0)))
        .outerjoin(models.ViewEvent, models.ViewEvent.menu_item_id == models.MenuItem.id)
        .where(models.MenuItem.tenant_id == tenant_id)
        .group_by(models.MenuItem.id, models.MenuItem.name)
    ).all()
    per = [PerItemStat(id=r[0], name=r[1], views=r[2] or 0, ar_launches=r[3] or 0)
           for r in rows]
    return AnalyticsSummary(total_views=total, ar_launches=ar, per_item=per)
