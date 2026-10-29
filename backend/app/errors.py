from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code_map = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "validation",
    }
    status = exc.status_code or 500
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code_map.get(status, "error"), "message": exc.detail or "Terjadi kesalahan."}},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Jangan bocorkan stack trace ke klien; log saja di server.
    print(f"UNHANDLED {request.method} {request.url.path}: {exc!r}", flush=True)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal", "message": "Kesalahan internal."}},
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation",
                "message": "Data tidak valid: "
                + "; ".join(f"{'.'.join(str(x) for x in e.get('loc', []))}: {e.get('msg', '')}"
                             for e in exc.errors()[:3]),
            }
        },
    )
