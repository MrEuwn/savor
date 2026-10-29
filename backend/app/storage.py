from __future__ import annotations

import os
import re
import secrets
import shutil
import subprocess
from pathlib import Path

from .config import settings
from .errors import AppError

MAX_IMAGE_BYTES = 2 * 1024 * 1024
MAX_GLB_BYTES = 3 * 1024 * 1024

_IMAGE_MAGIC: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"RIFF", "webp"),  # disaring lagi: offset 8 == WEBP
)


def _storage_root() -> Path:
    root = Path(settings.storage_local_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _sanitize(filename: str, fallback: str) -> str:
    base = os.path.basename(filename or "").strip()
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", base)[:80]
    return base or fallback


def _validate_image(data: bytes) -> str:
    if len(data) > MAX_IMAGE_BYTES:
        raise AppError(413, "asset_too_large", "Gambar maksimal 2 MB.")
    for magic, ext in _IMAGE_MAGIC:
        if data.startswith(magic):
            if ext == "webp" and data[8:12] != b"WEBP":
                continue
            return ext
    raise AppError(415, "invalid_asset_type",
                   "Gambar harus JPG, PNG, atau WebP (cek isi file, bukan ekstensi).")


def _validate_glb(data: bytes) -> None:
    if len(data) > MAX_GLB_BYTES:
        raise AppError(413, "asset_too_large", "GLB maksimal 3 MB.")
    if len(data) < 12 or data[:4] != b"glTF":
        raise AppError(415, "invalid_asset_type",
                       "File harus GLB valid (header glTF).")


def _drop_in_place(src: Path) -> None:
    """ Jalankan gltfpack bila tersedia; gagal/tak ada -> pakai file apa adanya. """
    gltfpack = shutil.which("gltfpack")
    if not gltfpack:
        return
    try:
        result = subprocess.run([gltfpack, "-i", str(src), "-o", str(src)],
                                capture_output=True, timeout=60, check=False)
    except (OSError, subprocess.SubprocessError):  # ponytail: optimizer best-effort
        return
    if result.returncode != 0:
        print(f"gltfpack failed rc={result.returncode}: {result.stderr.decode(errors='ignore')[:200]}", flush=True)
        print("ponytail: pakai file asli; upgrade: log terstruktur + fallback DRACO.")


def save_asset(tenant_id: int, kind: str, filename: str, data: bytes) -> str:
    if kind == "image":
        ext = _validate_image(data)
        prefix = "img"
    elif kind == "glb":
        _validate_glb(data)
        ext = "glb"
        prefix = "glb"
    else:
        raise AppError(400, "bad_request", "kind harus 'image' atau 'glb'.")
    sub = _storage_root() / f"t{tenant_id}" / secrets.token_hex(4)
    sub.mkdir(parents=True, exist_ok=True)
    path = sub / f"{prefix}_{_sanitize(filename, 'asset')}.{ext}"
    path.write_bytes(data)
    if kind == "glb":
        _drop_in_place(path)
    return f"t{tenant_id}/{path.parent.name}/{path.name}"


def asset_path(key: str) -> Path:
    root = _storage_root()
    path = (root / key).resolve()
    if not str(path).startswith(str(root.resolve())) or not path.is_file():
        raise AppError(404, "not_found", "Aset tidak ditemukan.")
    return path
