from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Auth ----------
class RegisterTenantIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    slug: str | None = Field(default=None, min_length=2, max_length=60,
                             pattern=r"^[a-z0-9-]+$")


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class TenantOut(BaseModel):
    id: int
    slug: str
    name: str


class AuthOut(BaseModel):
    access_token: str
    refresh_token: str
    tenant: TenantOut
    role: str


# ---------- Menu ----------
class MenuItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=2000)
    price: int = Field(ge=0, le=1_000_000_000)
    category: str = Field(default="Lainnya", max_length=60)
    is_available: bool = True
    calories_kcal: int | None = Field(default=None, ge=0, le=100000)
    external_id: str | None = Field(default=None, max_length=64)


class MenuItemPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    price: int | None = Field(default=None, ge=0, le=1_000_000_000)
    category: str | None = Field(default=None, max_length=60)
    is_available: bool | None = None
    calories_kcal: int | None = Field(default=None, ge=0, le=100000)
    external_id: str | None = Field(default=None, max_length=64)


class MenuItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    external_id: str | None
    name: str
    description: str
    price: int
    category: str
    calories_kcal: int | None
    is_available: bool
    image_url: str | None = None
    glb_url: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class AssetUploadOut(BaseModel):
    image_url: str | None
    glb_url: str | None
    status: str


# ---------- POS ----------
class PosItemIn(BaseModel):
    external_id: str
    name: str
    description: str = ""
    price: int = Field(ge=0)
    category: str = "Lainnya"
    is_available: bool = True


class PosMenuSyncIn(BaseModel):
    items: list[PosItemIn] = Field(min_length=1, max_length=500)


class PosAvailabilityIn(BaseModel):
    is_available: bool


# ---------- Publik ----------
class PublicItemOut(MenuItemOut):
    pass


class PublicMenuOut(BaseModel):
    tenant_name: str
    table: str | None
    items: list[PublicItemOut]


class PublicEventIn(BaseModel):
    slug: str = Field(min_length=2, max_length=60)
    menu_item_id: int
    ar_launched: bool = False


# ---------- Integrasi ----------
class ApiKeyIn(BaseModel):
    label: str = Field(default="pos", max_length=64)


class ApiKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    label: str
    last_used_at: datetime | None
    revoked_at: datetime | None


class ApiKeyCreated(ApiKeyOut):
    key: str


class WebhookIn(BaseModel):
    url: str = Field(max_length=512)
    secret: str = Field(min_length=16, max_length=128)
    events: list[str] = Field(default_factory=lambda: ["availability_changed", "menu_synced"])


class WebhookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    url: str
    secret: str
    events: list[str]


# ---------- Analitik ----------
class PerItemStat(BaseModel):
    id: int
    name: str
    views: int
    ar_launches: int


class AnalyticsSummary(BaseModel):
    total_views: int
    ar_launches: int
    per_item: list[PerItemStat]
