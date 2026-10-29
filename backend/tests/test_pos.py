from conftest import make_tenant, tokens


def _key(client, tenant) -> str:
    r = client.post("/integrations/api-keys", json={"label": "pos-demo"},
                    headers=tokens(tenant["auth"]))
    assert r.status_code == 201, r.text
    return r.json()["key"]


def test_api_key_created_once(client):
    t = make_tenant(client, "p1")
    h = tokens(t["auth"])
    key = _key(client, t)
    assert key.startswith("mk_mat_")
    listing = client.get("/integrations/api-keys", headers=h).json()
    assert len(listing) == 1 and listing[0]["label"] == "pos-demo"
    assert "key" not in listing[0]  # raw key hanya ditampilkan sekali


def test_menu_sync_and_availability_flow(client):
    t = make_tenant(client, "p2")
    key = _key(client, t)
    slug = t["tenant"]["slug"]
    kh = {"X-MejaAR-Key": key}

    # Sinkron pertama: 2 item baru
    r = client.post("/pos/menu-sync",
                    json={"items": [
                        {"external_id": "P-1", "name": "Soto", "price": 20000,
                         "category": "Makanan", "is_available": True},
                        {"external_id": "P-2", "name": "Es Teh", "price": 5000,
                         "category": "Minuman", "is_available": True},
                    ]},
                    headers=kh)
    assert r.status_code == 200
    assert r.json()["upserted"] == 2

    pub = client.get(f"/public/{slug}/menu").json()
    assert {i["name"] for i in pub["items"]} == {"Soto", "Es Teh"}

    # Ubah ketersediaan -> terlihat cepat di publik (cache di-invalidasi)
    r = client.patch("/pos/items/P-2/availability", json={"is_available": False},
                     headers=kh)
    assert r.status_code == 200
    pub2 = client.get(f"/public/{slug}/menu").json()
    es_teh = next(i for i in pub2["items"] if i["name"] == "Es Teh")
    assert es_teh["is_available"] is False

    # Item bukan milik tenant -> 404
    r = client.patch("/pos/items/ASING/availability", json={"is_available": True},
                     headers=kh)
    assert r.status_code == 404

    # Updat existing (stok kembali)
    r = client.patch("/pos/items/P-2/availability", json={"is_available": True},
                     headers=kh)
    assert r.json()["is_available"] is True


def test_invalid_api_key_rejected(client):
    make_tenant(client, "p3")
    r = client.post("/pos/menu-sync",
                    json={"items": [{"external_id": "X", "name": "N", "price": 1}]},
                    headers={"X-MejaAR-Key": "salah"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"
    # tanpa header
    assert client.post("/pos/menu-sync",
                       json={"items": [{"external_id": "X", "name": "N", "price": 1}]}
                       ).status_code == 401


def test_pos_key_cannot_touch_other_tenant(client):
    a = make_tenant(client, "pa")
    b = make_tenant(client, "pb")
    key_a = _key(client, a)
    key_b = _key(client, b)
    # Seed item via API key B
    client.post("/pos/menu-sync",
                json={"items": [{"external_id": "B-1", "name": "MilikB", "price": 100}]},
                headers={"X-MejaAR-Key": key_b})
    # API key A tidak boleh mengubah item B (external_id unik global)
    r = client.patch("/pos/items/B-1/availability", json={"is_available": False},
                     headers={"X-MejaAR-Key": key_a})
    assert r.status_code == 404
    # sync A hanya menyentuh data A
    r = client.post("/pos/menu-sync",
                    json={"items": [{"external_id": "A-1", "name": "MilikA", "price": 200}]},
                    headers={"X-MejaAR-Key": key_a})
    assert r.json()["upserted"] == 1
    pub_b = client.get(f"/public/{b['tenant']['slug']}/menu").json()
    assert {i["name"] for i in pub_b["items"]} == {"MilikB"}
    pub_a = client.get(f"/public/{a['tenant']['slug']}/menu").json()
    assert {i["name"] for i in pub_a["items"]} == {"MilikA"}


def test_revoke_api_key(client):
    t = make_tenant(client, "p4")
    h = tokens(t["auth"])
    key = _key(client, t)
    keys = client.get("/integrations/api-keys", headers=h).json()
    r = client.delete(f"/integrations/api-keys/{keys[0]['id']}", headers=h)
    assert r.status_code == 204
    r = client.post("/pos/menu-sync",
                    json={"items": [{"external_id": "R", "name": "N", "price": 1}]},
                    headers={"X-MejaAR-Key": key})
    assert r.status_code == 401
