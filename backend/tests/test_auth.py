from conftest import register, tokens


def test_register_and_login(client):
    auth = register(client, name="Café Demo", email="a@demo.id")
    assert auth["role"] == "tenant_owner"
    assert auth["tenant"]["slug"].startswith("cafe-demo")
    r = client.post("/auth/login",
                    json={"email": "a@demo.id", "password": "rahasiam1"})
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_register_email_conflict(client):
    register(client, email="b@demo.id", name="Satu")
    r = client.post("/auth/register-tenant",
                    json={"name": "Dua", "email": "b@demo.id", "password": "rahasiam1"})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "conflict"


def test_login_bad_password_401(client):
    register(client, email="c@demo.id", name="Tiga")
    r = client.post("/auth/login", json={"email": "c@demo.id", "password": "salahsekali"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthorized"


def test_listing_requires_token(client):
    assert client.get("/menu-items").status_code == 401
    assert client.get("/menu-items", headers={"Authorization": "Bearer x"}).status_code == 401


def test_refresh_rotation(client):
    auth = register(client, email="d@demo.id", name="Empat")
    r1 = client.post("/auth/refresh", json={"refresh_token": auth["refresh_token"]})
    assert r1.status_code == 200
    new_refresh = r1.json()["refresh_token"]
    # Token lama sudah dibatalkan (rotasi)
    r2 = client.post("/auth/refresh", json={"refresh_token": auth["refresh_token"]})
    assert r2.status_code == 401
    r3 = client.post("/auth/refresh", json={"refresh_token": new_refresh})
    assert r3.status_code == 200


def test_access_tenant_endpoint(client):
    auth = register(client, email="e@demo.id", name="Lima")
    r = client.get("/menu-items", headers=tokens(auth))
    assert r.status_code == 200
    assert r.json() == []
