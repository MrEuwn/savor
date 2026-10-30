# Kontrak API SAVOR (Terkunci)

Agent backend & frontend HARUS mengikuti kontrak ini. Perbedaan apa pun dicatat
di docs/DECISIONS.md. Base backend: `http://localhost:8000`.

## Konvensi

- Error format seragam: `{"error": {"code": str, "message": str}}` (4xx/5xx).
- Auth manusia: `Authorization: Bearer <access_jwt>`. Claims: sub, tenant_id, role.
- Auth mesin (POS): header `X-SAVOR-Key: <raw key>`. Server menyimpan hash sha256.
- Uang: integer rupiah (mis. 25000).
- URL aset lokal (dev): `http://localhost:8000/assets/<key>` served statis oleh FastAPI.

## Auth (publik, rate-limit /auth/login 5/minute/IP)

- `POST /auth/register-tenant` body `{name, email, password, slug?}`
  → 201 `{"access_token","refresh_token","tenant":{"id","slug","name"},"role":"tenant_owner"}`
  slug otomatis dari nama bila tidak dikirimi; harus unik (409 bila duplikat).
- `POST /auth/login` body `{email, password}` → 200 seperti di atas; 401 invalid.
- `POST /auth/refresh` body `{refresh_token}` → 200 token baru dua-duanya (rotasi;
  refresh lama dibatalkan). 401 kadaluarsa/digunakan ulang.

Token: access 15 menit, refresh 14 hari, HS256 dari `JWT_SECRET`.

## Menu items (JWT role owner/staff)

- `GET /menu-items` → `[item]`
- `POST /menu-items` body `{name, description, price, category, is_available?, calories_kcal?}` → 201 `item` (status `draft`)
- `GET /menu-items/{id}` → `item`
- `PATCH /menu-items/{id}` → `item` (204 bila kosong)
- `DELETE /menu-items/{id}` → 204
- `POST /menu-items/{id}/assets` multipart `file` (image dan/atau glb; field `kind`: `image`|`glb`)
  Validasi: image = jpg/png/webp (MIME + magic bytes), <= 2 MB; glb = mulai `glTF`
  (magic bytes), <= 3 MB. Filename disanitasi. GLB diproses gltfpack bila tersedia
  (compact+kdr), bila tidak dipakai apa adanya.
  → 200 `{"image_url": str|null, "glb_url": str|null, "status": "draft|processing|ready|failed"}`
  (status `ready` bila minimal salah satu aset tersimpan.)
- Item response: `{id, external_id, name, description, price, category,
  calories_kcal, is_available, image_url, glb_url, status, created_at, updated_at}`
  (URL null bila aset belum ada; computed dari key + STORAGE base.)

## Publik (tanpa login; rate-limit /public/events 60/minute/IP)

- `GET /public/{slug}/menu?table={code?}` → `{"tenant_name","table":str|null,"items":[...]}` (item seperti di atas, hanya `is_available=true` dibarengi semua kecuali parameter `?all=1`)
- `GET /public/{slug}/menu/{id}` → `item`
- `POST /public/events` body `{slug, menu_item_id, ar_launched}` → 202 `{}` (tanpa PII; menu id tidak cocok/menubah 204)

## POS (header X-SAVOR-Key)

- `POST /pos/menu-sync` body `{"items":[{"external_id","name","description","price","category","is_available"}]}`
  → 200 `{"upserted": n}` (upsert per tenant key; menginvalidasi cache menu publik slug tsb)
- `PATCH /pos/items/{external_id}/availability` body `{"is_available": bool}` → 200; 404 bila external_id asing; invalidasi cache.

## Integrasi (JWT owner)

- `POST /integrations/api-keys` body `{label}` → 201 `{id, label, key, last_used_at}` (key hanya ditampilkan sekali)
- `GET /integrations/api-keys` → `[{id,label,last_used_at,revoked_at}]`
- `DELETE /integrations/api-keys/{id}` → 204 (revoke)
- `POST /integrations/webhooks` body `{url, secret, events:[str]}` → 201; `GET` daftar (T15 memakai).

## Analitik (JWT owner)

- `GET /analytics/summary` → `{total_views, ar_launches, per_item:[{id,name,views,ar_launches}]}`

## Operasional

- `GET /healthz` → 200 `{"status":"ok"}` (lulus tanpa DB)
- `GET /readyz` → 200 bila DB siap, selain itu 503
- `GET /docs`, `/openapi.json` publik.

## Isolasi tenant (wajib)

Setiap query data tenant DI-Filter `tenant_id` di lapisan repository. Tes wajib:
tenant A tak bisa membaca/mengubah item/aset tenant B; POS key tenant A tidak
boleh menyentuh item tenant B.
