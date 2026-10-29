

def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_readyz(client):
    r = client.get("/readyz")
    assert r.status_code == 200
    assert r.json()["status"] == "ready"


def test_uniform_error_shape(client):
    r = client.get("/does-not-exist")
    assert r.status_code == 404
    body = r.json()
    assert set(body["error"].keys()) >= {"code", "message"}
    assert body["error"]["code"] == "not_found"


def test_openapi_public(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    assert "/auth/login" in r.json()["paths"]
