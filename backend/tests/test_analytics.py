from conftest import make_staff, make_tenant, tokens


def _seed(client, tenant):
    h = tokens(tenant["auth"])
    r = client.post("/menu-items", json={"name": "Hero", "price": 30000}, headers=h)
    assert r.status_code == 201
    return r.json()["id"]


def test_analytics_summary(client):
    t = make_tenant(client, "a1")
    slug = t["tenant"]["slug"]
    hero = _seed(client, t)
    client.post("/public/events", json={"slug": slug, "menu_item_id": hero, "ar_launched": False})
    client.post("/public/events", json={"slug": slug, "menu_item_id": hero, "ar_launched": True})
    client.post("/public/events", json={"slug": slug, "menu_item_id": hero, "ar_launched": False})

    r = client.get("/analytics/summary", headers=tokens(t["auth"]))
    assert r.status_code == 200
    s = r.json()
    assert s["total_views"] == 3
    assert s["ar_launches"] == 1
    assert s["per_item"][0]["name"] == "Hero"
    assert s["per_item"][0]["views"] == 3
    assert s["per_item"][0]["ar_launches"] == 1


def test_analytics_forbidden_for_staff(client):
    t = make_tenant(client, "a2")
    staff = make_staff(client, t["tenant"]["slug"])
    assert staff["role"] == "tenant_staff"
    r = client.get("/analytics/summary", headers=tokens(staff))
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "forbidden"


def test_analytics_requires_auth(client):
    r = client.get("/analytics/summary")
    assert r.status_code == 401
