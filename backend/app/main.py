from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import models
from .config import settings
from .db import engine
from .errors import (
    AppError,
    app_error_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_error_handler,
)
from .limiter import limiter
from .routers import analytics, auth, integrations, menu, pos, public, tables
from .security import rate_limit_error_handler
from .storage import _storage_root


def create_app() -> FastAPI:
    app = FastAPI(title="MejaAR API", version="0.1.0")
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)  # type: ignore[arg-type]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    for router in (auth.router, menu.router, public.router, pos.router,
                   integrations.router, tables.router, analytics.router):
        app.include_router(router)

    @app.get("/healthz", tags=["ops"])
    def healthz():
        return {"status": "ok"}

    @app.get("/readyz", tags=["ops"])
    def readyz():
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except Exception:  # noqa: BLE001 - readiness check sengaja luas
            return JSONResponse(status_code=503, content={"status": "unready"})
        return {"status": "ready"}

    # Penyajian aset statis (dev / storage lokal). Produksi: S3/R2 + CDN.
    _storage_root().mkdir(parents=True, exist_ok=True)
    app.mount("/assets", StaticFiles(directory=str(_storage_root())), name="assets")
    return app


app = create_app()


def init_db() -> None:
    models.Base.metadata.create_all(engine)


init_db()
