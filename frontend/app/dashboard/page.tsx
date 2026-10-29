"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toString as qrToString } from "qrcode";
import { Badge, Button, Card } from "@/components/ui";
import { apiFetch, clearAuth, errMsg, getAuth } from "@/lib/api";

const inputCls =
  "min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600";

type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  calories_kcal: number | null;
  is_available: boolean;
  image_url: string | null;
  glb_url: string | null;
  status: string;
};

type TableCode = { id: number; code: string };
type ApiKey = {
  id: number;
  label: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function DashboardPage() {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [summary, setSummary] = useState<{
    total_views: number;
    ar_launches: number;
    per_item: { id: number; name: string; views: number; ar_launches: number }[];
  } | null>(null);
  const [tables, setTables] = useState<TableCode[]>([]);
  const [tableCode, setTableCode] = useState("");
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [rawKey, setRawKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [summaryErr, setSummaryErr] = useState("");
  const [menuErr, setMenuErr] = useState("");
  const [tablesErr, setTablesErr] = useState("");
  const [keysErr, setKeysErr] = useState("");

  // Form item baru
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [calories, setCalories] = useState("");
  const [itemErr, setItemErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Label API key
  const [keyLabel, setKeyLabel] = useState("");
  const [keyErr, setKeyErr] = useState("");

  const loadAll = useCallback(async () => {
    const [s, m, t, k] = await Promise.allSettled([
      apiFetch<{
        total_views: number;
        ar_launches: number;
        per_item: { id: number; name: string; views: number; ar_launches: number }[];
      }>("/analytics/summary"),
      apiFetch<MenuItem[]>("/menu-items"),
      apiFetch<TableCode[]>("/tables"),
      apiFetch<ApiKey[]>("/integrations/api-keys"),
    ]);
    if (s.status === "fulfilled") setSummary(s.value);
    else setSummaryErr(errMsg(s.reason));
    if (m.status === "fulfilled") setMenu(m.value);
    else setMenuErr(errMsg(m.reason));
    if (t.status === "fulfilled") setTables(t.value);
    else setTablesErr(errMsg(t.reason));
    if (k.status === "fulfilled") setKeys(k.value);
    else setKeysErr(errMsg(k.reason));
  }, []);

  // Guard auth: tanpa token → /login
  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setSlug(auth.tenant.slug);
    loadAll();
  }, [router, loadAll]);

  const logout = () => {
    clearAuth();
    router.replace("/login");
  };

  const addMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setItemErr("");
    try {
      await apiFetch<MenuItem>("/menu-items", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          price: Number(price),
          category,
          calories_kcal: calories ? Number(calories) : null,
        }),
      });
      setName("");
      setDescription("");
      setPrice("");
      setCategory("");
      setCalories("");
      await loadAll();
    } catch (e2) {
      setItemErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!window.confirm("Hapus item ini?")) return;
    try {
      await apiFetch<void>(`/menu-items/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e2) {
      setMenuErr(errMsg(e2));
    }
  };

  const toggleAvailable = async (item: MenuItem) => {
    // Optimisistik agar responsif; koreksi kembali bila gagal.
    const prev = menu;
    setMenu((m) =>
      m ? m.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i)) : m,
    );
    try {
      await apiFetch<void>(`/menu-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_available: !item.is_available }),
      });
    } catch (e2) {
      setMenu(prev);
      setMenuErr(errMsg(e2));
    }
  };

  const uploadAsset = (item: MenuItem, kind: "image" | "glb") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = kind === "image" ? "image/jpeg,image/png,image/webp" : "model/gltf-binary,.glb";
    input.setAttribute("aria-label", `Unggah ${kind === "image" ? "foto" : "model GLB"} untuk ${item.name}`);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      try {
        await apiFetch<{ status: string }>(`/menu-items/${item.id}/assets`, {
          method: "POST",
          body: fd,
        });
        await loadAll();
      } catch (e2) {
        setMenuErr(errMsg(e2));
      }
    };
    input.click();
  };

  const addTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setTablesErr("");
    try {
      const created = await apiFetch<TableCode>("/tables", {
        method: "POST",
        body: JSON.stringify({ code: tableCode }),
      });
      if (!tables.some((t) => t.id === created.id)) setTables([...tables, created]);
      setTableCode("");
    } catch (e2) {
      setTablesErr(errMsg(e2));
    }
  };

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyErr("");
    setCopied(false);
    try {
      const created = await apiFetch<{ key: string }>("/integrations/api-keys", {
        method: "POST",
        body: JSON.stringify({ label: keyLabel }),
      });
      setRawKey(created.key);
      setKeyLabel("");
      await loadAll();
    } catch (e2) {
      setKeyErr(errMsg(e2));
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
    } catch {
      // papan klip tidak tersedia
    }
  };

  const revokeKey = async (id: number) => {
    if (!window.confirm("Cabut (revoke) API key ini?")) return;
    try {
      await apiFetch<void>(`/integrations/api-keys/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e2) {
      setKeysErr(errMsg(e2));
    }
  };

  const [qrImages, setQrImages] = useState<{ code: string; dataUrl: string }[]>([]);
  useEffect(() => {
    // ponytail: QR di-render async; kalau lambat tautan teks saja dulu. Upgrade: skeleton.
    if (!slug) {
      setQrImages([]);
      return;
    }
    let on = true;
    // ponytail: origin bisa dicover via NEXT_PUBLIC_PUBLIC_BASE (Vercel URL) agar
    // QR dari dashboard tetap menunjuk HTTPS; default = origin browser.
    const origin =
      process.env.NEXT_PUBLIC_PUBLIC_BASE?.replace(/\/$/, "") ||
      window.location.origin;
    Promise.all(
      tables.map(async (t) => ({
        code: t.code,
        dataUrl: await qrToString(`${origin}/public/${slug}?table=${encodeURIComponent(t.code)}`, {
          margin: 1,
          width: 220,
        }),
      })),
    )
      .then((all) => on && setQrImages(all))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [tables, slug]);

  if (!slug) {
    return <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-stone-600">Memeriksa sesi…</main>;
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-stone-600">{slug}</p>
        </div>
        <Button variant="outline" onClick={logout}>
          Keluar
        </Button>
      </header>

      <div className="space-y-4">
        <Card title="Ringkasan">
          {summaryErr ? (
            <p className="text-sm text-red-700">{summaryErr}</p>
          ) : summary ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-stone-100 p-3">
                  <p className="text-2xl font-semibold tabular-nums">{summary.total_views}</p>
                  <p className="text-xs text-stone-600">Total Tampil</p>
                </div>
                <div className="rounded-xl bg-stone-100 p-3">
                  <p className="text-2xl font-semibold tabular-nums">{summary.ar_launches}</p>
                  <p className="text-xs text-stone-600">Peluncuran AR</p>
                </div>
              </div>
              {summary.per_item.length > 0 && (
                <table className="mt-3 w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-stone-500">
                      <th scope="col" className="py-1 pr-2 font-medium">Item</th>
                      <th scope="col" className="py-1 pr-2 font-medium">Tampil</th>
                      <th scope="col" className="py-1 font-medium">AR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.per_item.map((p) => (
                      <tr key={p.id} className="border-t border-stone-100">
                        <td className="py-1.5 pr-2">{p.name}</td>
                        <td className="py-1.5 pr-2 tabular-nums">{p.views}</td>
                        <td className="py-1.5 tabular-nums">{p.ar_launches}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-600">Memuat…</p>
          )}
        </Card>

        <Card title="Menu">
          {menuErr && <p className="mb-3 text-sm text-red-700" role="alert">{menuErr}</p>}
          <form onSubmit={addMenuItem} className="mb-4 space-y-2 rounded-xl bg-stone-100 p-3">
            <h3 className="text-sm font-medium">Tambah item</h3>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama item" aria-label="Nama item" required />
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi" aria-label="Deskripsi item" required />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga (Rp)" aria-label="Harga dalam rupiah" required />
              <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kategori" aria-label="Kategori" required />
            </div>
            <input className={inputCls} type="number" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Kalori (opsional)" aria-label="Kalori (opsional)" />
            {itemErr && <p className="text-sm text-red-700" role="alert">{itemErr}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Menyimpan…" : "Tambah Item"}
            </Button>
          </form>

          {!menu ? (
            <p className="text-sm text-stone-600">Memuat…</p>
          ) : menu.length === 0 ? (
            <p className="text-sm text-stone-600">Belum ada item menu.</p>
          ) : (
            <ul className="space-y-3">
              {menu.map((item) => (
                <li key={item.id} className="rounded-xl border border-stone-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-stone-600">
                        {item.category} · {rupiah.format(item.price)}
                        {item.calories_kcal ? ` · ${item.calories_kcal} kkal` : ""}
                      </p>
                    </div>
                    <Badge tone={item.is_available ? "emerald" : "red"}>
                      {item.is_available ? "Tersedia" : "Habis"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    {item.image_url ? (
                      <img src={item.image_url} alt={`Foto ${item.name}`} className="h-14 w-14 rounded-lg object-cover" />
                    ) : (
                      <span className="text-stone-500">Tanpa foto</span>
                    )}
                    {item.glb_url && <Badge tone="emerald">GLB</Badge>}
                    <Badge tone={item.status === "ready" ? "emerald" : "amber"}>{item.status}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => uploadAsset(item, "image")}>
                      Unggah Foto
                    </Button>
                    <Button variant="outline" onClick={() => uploadAsset(item, "glb")}>
                      Unggah GLB
                    </Button>
                    <Button variant="outline" onClick={() => toggleAvailable(item)}>
                      {item.is_available ? "Tandai Habis" : "Tandai Tersedia"}
                    </Button>
                    <Button variant="danger" onClick={() => deleteItem(item.id)}>
                      Hapus
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tabel">
          {tablesErr && <p className="mb-3 text-sm text-red-700" role="alert">{tablesErr}</p>}
          <form onSubmit={addTable} className="mb-3 flex gap-2">
            <input
              className={inputCls + " flex-1"}
              value={tableCode}
              onChange={(e) => setTableCode(e.target.value)}
              placeholder="Kode, mis. T-01"
              aria-label="Kode tabel"
              required
              minLength={2}
              maxLength={32}
              pattern="[A-Za-z0-9-]+"
            />
            <Button type="submit">Tambah</Button>
          </form>
          {tables.length === 0 ? (
            <p className="text-sm text-stone-600">Belum ada tabel.</p>
          ) : (
            <ul className="space-y-3">
              {tables.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3">
                  <span className="w-16 shrink-0 font-medium tabular-nums">{t.code}</span>
                  {qrImages.find((q) => q.code === t.code) && (
                    // ponytail: QR di-render async; kalau lambat tampak tautan dulu. Upgrade: loading skeleton.
                    <img
                      src={qrImages.find((q) => q.code === t.code)!.dataUrl}
                      alt={`Kode QR untuk tabel ${t.code}`}
                      className="h-16 w-16 rounded bg-white"
                    />
                  )}
                  <a
                    href={`/public/${slug}?table=${encodeURIComponent(t.code)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-9 shrink-0 rounded-lg px-2 text-sm text-emerald-700 underline underline-offset-2"
                  >
                    Buka menu
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Integrasi">
          {keysErr && <p className="mb-3 text-sm text-red-700" role="alert">{keysErr}</p>}
          {rawKey && (
            <div className="mb-3 rounded-xl bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-800">
                API key dibuat. Salin sekarang — hanya ditampilkan satu kali.
              </p>
              <p className="mt-1 break-all font-mono text-xs">{rawKey}</p>
              <Button variant="outline" className="mt-2 min-h-9 text-xs" onClick={copyKey} aria-label="Salin API key">
                {copied ? "Tersalin" : "Salin"}
              </Button>
            </div>
          )}
          <form onSubmit={createKey} className="mb-3 flex gap-2">
            <input
              className={inputCls + " flex-1"}
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              placeholder="Label, mis. POS Kitchen"
              aria-label="Label API key"
              required
            />
            <Button type="submit">Buat</Button>
          </form>
          {keys === null ? (
            <p className="text-sm text-stone-600">Memuat…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-stone-600">Belum ada API key.</p>
          ) : (
            <ul className="space-y-2">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className={k.revoked_at ? "text-stone-400 line-through" : ""}>{k.label}</span>
                    <span className="ml-2 text-xs text-stone-500">
                      {k.revoked_at ? "Dicabut" : "Aktif"}
                      {k.last_used_at ? ` · terakhir ${k.last_used_at.slice(0, 10)}` : ""}
                    </span>
                  </span>
                  {!k.revoked_at && (
                    <Button variant="danger" className="min-h-9 text-xs" onClick={() => revokeKey(k.id)}>
                      Cabut
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
