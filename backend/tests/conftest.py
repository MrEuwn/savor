from __future__ import annotations

import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test_savor.db"
os.environ["JWT_SECRET"] = "test-secret-0123456789-0123456789"
os.environ["STORAGE_LOCAL_DIR"] = "./test_storage"
os.environ["ASSETS_PUBLIC_BASE"] = "http://testserver/assets"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"

from app import models
from app.config import settings
from app.db import Base, get_db
from app.main import create_app

_engine = create_engine(
    settings.database_url, connect_args={"check_same_thread": False}
)
_TestSession = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    Base.metadata.drop_all(_engine)
    Base.metadata.create_all(_engine)

    app = create_app()

    def override_get_db():
        db = _TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c

    Base.metadata.drop_all(_engine)


def register(client, name="Restoran Uji", email="owner@uji.id",
             password="rahasiam1", slug=None) -> dict:
    body = {"name": name, "email": email, "password": password}
    if slug:
        body["slug"] = slug
    r = client.post("/auth/register-tenant", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def tokens(auth: dict) -> dict:
    return {"Authorization": f"Bearer {auth['access_token']}"}


def make_staff(client, tenant_slug: str) -> dict:
    """Login sebagai tenant_staff (di-create via DB; tidak ada endpoint undangan di MVP)."""
    from sqlalchemy import select

    from app.security import hash_password

    email = f"staff-{tenant_slug}@uji.id"
    db = _TestSession()
    try:
        tenant = db.scalar(select(models.Tenant).where(models.Tenant.slug == tenant_slug))
        assert tenant is not None
        existing = db.scalar(select(models.User).where(models.User.email == email))
        if existing is None:
            db.add(models.User(tenant_id=tenant.id, email=email,
                               password_hash=hash_password("rahasiam1"),
                               role="tenant_staff"))
            db.commit()
    finally:
        db.close()
    r = client.post("/auth/login", json={"email": email, "password": "rahasiam1"})
    assert r.status_code == 200, r.text
    return r.json()


def make_tenant(client, suffix: str) -> dict:
    auth = register(client, name=f"Restoran {suffix.upper()}",
                    email=f"owner{suffix}@uji.id", password="rahasiam1",
                    slug=f"restoran{suffix}")
    return {**auth, "auth": auth}
