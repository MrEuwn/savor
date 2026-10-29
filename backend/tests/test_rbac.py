from conftest import make_staff, make_tenant, tokens


def test_staff_can_manage_menu_but_not_integrations(client):
    t = make_tenant(client, "r1")
    staff = make_staff(client, t["tenant"]["slug"])
    h = tokens(staff)

    # Staff boleh CRUD menu
    r = client.post("/menu-items", json={"name": "Van Staff", "price": 12000}, headers=h)
    assert r.status_code == 201, r.text
    assert client.patch(f"/menu-items/{r.json()['id']}", json={"price": 13000},
                        headers=h).status_code == 200

    # Staff tidak boleh: API key, tabel, analitik
    assert client.post("/integrations/api-keys", json={"label": "x"}, headers=h).status_code == 403
    assert client.get("/integrations/api-keys", headers=h).status_code == 403
    assert client.post("/tables", json={"code": "t1"}, headers=h).status_code == 403
    assert client.get("/analytics/summary", headers=h).status_code == 403
    # Tanpa token
    assert client.get("/integrations/api-keys").status_code == 401
