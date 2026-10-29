import io

from conftest import make_tenant, tokens

PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c626001000000ffff030000060005"
    "57bfabd40000000049454e44ae426082"
)
# GLB valid untuk uji header magic bytes: magic "glTF", version 2, length 140
GLB = b"glTF" + (2).to_bytes(4, "little") + (140).to_bytes(4, "little") + b"\x00" * 128


def _upload(client, tenant, iid, kind, filename, data, expect):
    r = client.post(
        f"/menu-items/{iid}/assets",
        data={"kind": kind},
        files={"file": (filename, io.BytesIO(data), "application/octet-stream")},
        headers=tokens(tenant["auth"]),
    )
    assert r.status_code == expect, r.text
    return r.json()


def _item(client, tenant, name):
    r = client.post("/menu-items", json={"name": name, "price": 15000},
                    headers=tokens(tenant["auth"]))
    assert r.status_code == 201
    return r.json()["id"]


def test_upload_image_valid(client):
    t = make_tenant(client, "u1")
    iid = _item(client, t, "Gado")
    out = _upload(client, t, iid, "image", "gado.png", PNG, 200)
    assert out["image_url"] and out["status"] == "ready"
    r = client.get(out["image_url"].replace("http://testserver", ""))
    assert r.status_code == 200
    assert r.content == PNG


def test_upload_glb_valid(client):
    t = make_tenant(client, "u2")
    iid = _item(client, t, "Bakso")
    out = _upload(client, t, iid, "glb", "bakso.glb", GLB, 200)
    assert out["glb_url"] and out["status"] == "ready"


def test_upload_glb_wrong_magic_bytes(client):
    t = make_tenant(client, "u3")
    iid = _item(client, t, "Pst")
    _upload(client, t, iid, "glb", "bukan_glb.glb", b"png-imp " + PNG, 415)


def test_upload_image_wrong_magic_bytes(client):
    t = make_tenant(client, "u4")
    iid = _item(client, t, "Pst2")
    _upload(client, t, iid, "image", "bohong.png", b"this-is-not-an-image", 415)


def test_upload_glb_too_large(client):
    t = make_tenant(client, "u5")
    iid = _item(client, t, "Raksasa")
    huge = b"glTF" + b"\x00" * (3 * 1024 * 1024)
    _upload(client, t, iid, "glb", "raksasa.glb", huge, 413)


def test_upload_empty_file(client):
    t = make_tenant(client, "u6")
    iid = _item(client, t, "Kosong")
    r = client.post(
        f"/menu-items/{iid}/assets",
        data={"kind": "glb"},
        files={"file": ("x.glb", io.BytesIO(b""), "application/octet-stream")},
        headers=tokens(t["auth"]),
    )
    assert r.status_code == 400


def test_tenant_a_cannot_touch_tenant_b_assets(client):
    a = make_tenant(client, "ua")
    b = make_tenant(client, "ub")
    ia = _item(client, a, "A")
    ib = _item(client, b, "B")
    _upload(client, b, ib, "image", "b.png", PNG, 200)
    # A coba upload ke item B -> 404
    r = client.post(
        f"/menu-items/{ib}/assets",
        data={"kind": "image"},
        files={"file": ("x.png", io.BytesIO(PNG), "application/octet-stream")},
        headers=tokens(a["auth"]),
    )
    assert r.status_code == 404
    # A upload ke item sendiri -> ok
    assert _upload(client, a, ia, "image", "a.png", PNG, 200)["status"] == "ready"
