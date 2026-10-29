from conftest import make_tenant, tokens

ITEM = {"name": "Nasi Goreng", "description": "Porsi besar", "price": 25000,
        "category": "Makanan", "is_available": True, "calories_kcal": 650}


def _item_id(client, tenant, **overrides) -> int:
    r = client.post("/menu-items", json={**ITEM, **overrides}, headers=tokens(tenant["auth"]))
    assert r.status_code == 201, r.text
    item = r.json()
    assert item["status"] in ("draft", "processing", "ready")
    return item["id"]


def test_crud(client):
    t = make_tenant(client, "a")
    iid = _item_id(client, t)
    r = client.get(f"/menu-items/{iid}", headers=tokens(t["auth"]))
    assert r.status_code == 200
    assert r.json()["price"] == 25000
    r = client.patch(f"/menu-items/{iid}", json={"price": 27000}, headers=tokens(t["auth"]))
    assert r.json()["price"] == 27000
    assert client.delete(f"/menu-items/{iid}", headers=tokens(t["auth"])).status_code == 204
    assert client.get(f"/menu-items/{iid}", headers=tokens(t["auth"])).status_code == 404


def test_validation_price_negative(client):
    t = make_tenant(client, "b")
    r = client.post("/menu-items", json={**ITEM, "price": -5}, headers=tokens(t["auth"]))
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation"


def test_external_id_unique_per_tenant(client):
    t = make_tenant(client, "c")
    _item_id(client, t, external_id="POS-1")
    r = client.post("/menu-items", json={**ITEM, "external_id": "POS-1"},
                    headers=tokens(t["auth"]))
    assert r.status_code == 409
    # Tenant lain bebas pakai external_id sama (keunikan per-tenant)
    d = make_tenant(client, "d")
    r2 = client.post("/menu-items", json={**ITEM, "external_id": "POS-1"},
                     headers=tokens(d["auth"]))
    assert r2.status_code == 201


def test_tenant_isolation(client):
    a = make_tenant(client, "x")
    b = make_tenant(client, "y")
    iid = _item_id(client, a)
    # Tenant B tidak bisa membaca / mengubah / menghapus item A
    assert client.get(f"/menu-items/{iid}", headers=tokens(b["auth"])).status_code == 404
    assert client.patch(f"/menu-items/{iid}", json={"price": 1},
                        headers=tokens(b["auth"])).status_code == 404
    assert client.delete(f"/menu-items/{iid}", headers=tokens(b["auth"])).status_code == 404
    # Daftar B kosong
    assert client.get("/menu-items", headers=tokens(b["auth"])).json() == []
    # A tetap utuh
    assert client.get(f"/menu-items/{iid}", headers=tokens(a["auth"])).status_code == 200
