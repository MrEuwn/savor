from conftest import make_tenant, tokens


def _seed(client, tenant, n=3):
    h = tokens(tenant["auth"])
    ids = []
    for i in range(n):
        r = client.post("/menu-items",
                        json={"name": f"Dish {i}", "price": 1000 + i,
                              "category": "Makanan" if i % 2 else "Minuman",
                              "is_available": i != n - 1},
                        headers=h)
        assert r.status_code == 201
        ids.append(r.json()["id"])
    return ids


def test_public_menu_requires_no_login(client):
    t = make_tenant(client, "a")
    _seed(client, t)
    r = client.get(f"/public/{t['tenant']['slug']}/menu")
    assert r.status_code == 200
    body = r.json()
    assert body["tenant_name"] == "Restoran A"
    assert len(body["items"]) == 3
    assert body["items"][2]["is_available"] is False


def test_public_menu_unknown_slug_404(client):
    r = client.get("/public/tak-ada/menu")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


def test_public_menu_item(client):
    t = make_tenant(client, "b")
    ids = _seed(client, t)
    r = client.get(f"/public/{t['tenant']['slug']}/menu/{ids[0]}")
    assert r.status_code == 200
    assert r.json()["id"] == ids[0]
    u = make_tenant(client, "z")
    assert client.get(f"/public/{u['tenant']['slug']}/menu/{ids[0]}").status_code == 404


def test_public_event(client):
    t = make_tenant(client, "c")
    ids = _seed(client, t)
    r = client.post("/public/events",
                    json={"slug": t["tenant"]["slug"], "menu_item_id": ids[0],
                          "ar_launched": True})
    assert r.status_code == 202
    r2 = client.post("/public/events",
                     json={"slug": t["tenant"]["slug"], "menu_item_id": 99999,
                           "ar_launched": False})
    assert r2.status_code == 204
    r3 = client.post("/public/events", json={"slug": "tak-ada", "menu_item_id": 1})
    assert r3.status_code == 404


def test_table_code_in_url(client):
    t = make_tenant(client, "d")
    _seed(client, t)
    h = tokens(t["auth"])
    r = client.post("/tables", json={"code": "meja-01"}, headers=h)
    assert r.status_code == 201
    r = client.get(f"/public/{t['tenant']['slug']}/menu?table=meja-01")
    assert r.json()["table"] == "meja-01"
