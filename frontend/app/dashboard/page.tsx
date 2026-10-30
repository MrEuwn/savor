"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Upload,
  Copy,
  Check,
  LogOut,
  ExternalLink,
  Printer,
  FileBox,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { apiFetch, clearAuth, errMsg, getAuth } from "@/lib/api";

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
  status: "draft" | "processing" | "ready" | "failed" | string;
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
  const [restaurantName, setRestaurantName] = useState<string>("");
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

  // Errors
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

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setSlug(auth.tenant.slug);
    setRestaurantName(auth.tenant.name || auth.tenant.slug);
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
          name: name.trim(),
          description: description.trim(),
          price: Number(price),
          category: category.trim(),
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
    if (!window.confirm("Hapus item menu ini secara permanen?")) return;
    try {
      await apiFetch<void>(`/menu-items/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e2) {
      setMenuErr(errMsg(e2));
    }
  };

  const toggleAvailable = async (item: MenuItem) => {
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
    input.accept =
      kind === "image"
        ? "image/jpeg,image/png,image/webp"
        : "model/gltf-binary,.glb";
    input.setAttribute(
      "aria-label",
      `Unggah ${kind === "image" ? "foto" : "model GLB"} untuk ${item.name}`,
    );

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const maxMb = kind === "image" ? 5 : 15;
      if (file.size > maxMb * 1024 * 1024) {
        alert(
          `Ukuran file terlalu besar. Batas maksimal ${maxMb}MB untuk ${
            kind === "image" ? "gambar poster" : "model 3D GLB"
          }.`,
        );
        return;
      }

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
        body: JSON.stringify({ code: tableCode.trim() }),
      });
      if (!tables.some((t) => t.id === created.id)) {
        setTables([...tables, created]);
      }
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
        body: JSON.stringify({ label: keyLabel.trim() }),
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
      // clipboard fallback
    }
  };

  const revokeKey = async (id: number) => {
    if (!window.confirm("Cabut API key ini? Integrasi POS yang memakainya akan ditolak.")) {
      return;
    }
    try {
      await apiFetch<void>(`/integrations/api-keys/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e2) {
      setKeysErr(errMsg(e2));
    }
  };

  if (!slug) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper-white text-xs text-slate-gray">
        Memeriksa sesi…
      </main>
    );
  }

  const arRatio =
    summary && summary.total_views > 0
      ? ((summary.ar_launches / summary.total_views) * 100).toFixed(0)
      : "0";

  return (
    <div className="min-h-screen bg-fog-white text-ink-black pb-24">
      {/* Top Quiet Shell Bar */}
      <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-paper-white/95 backdrop-blur-md px-6 py-3.5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} className="rounded-xl shadow-xs" />
            <div>
              <span className="font-serif text-base font-normal tracking-tight text-ink-black block leading-none">
                {restaurantName || "MejaAR"}
              </span>
              <span className="text-[11px] text-slate-gray">
                /public/{slug}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={`/public/${slug}`}
              target="_blank"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-stone-200 bg-paper-white px-3.5 text-xs text-ink-black hover:bg-mist-gray/60 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Pratinjau Menu</span>
            </Link>
            <Link
              href="/dashboard/qr"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-ink-black px-4 text-xs text-paper-white hover:bg-ink-black/90 transition-colors"
            >
              <Printer className="h-3 w-3" />
              <span>Cetak QR Meja</span>
            </Link>
            <button
              onClick={logout}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 text-xs text-slate-gray hover:text-ink-black transition-colors cursor-pointer"
            >
              <LogOut className="h-3 w-3" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 pt-8 space-y-10">
        {/* Section 1: Ringkasan Metrik (Type-Led KPIs, Flat Surfaces, Anti-Slop) */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-stone-200/60 pb-3">
            <h1 className="font-serif text-2xl font-normal tracking-tight text-ink-black">
              Ringkasan Operasional
            </h1>
            <span className="text-xs text-slate-gray">
              Keterlibatan meja hari ini
            </span>
          </div>

          {summaryErr ? (
            <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              {summaryErr}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Metric 1 */}
              <div className="rounded-[20px] bg-paper-white border border-stone-200/80 p-5">
                <span className="text-xs text-slate-gray font-medium block">
                  Menu Dibuka Pelanggan
                </span>
                <p className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-ink-black tabular-nums tracking-tight">
                  {summary.total_views}
                </p>
                <p className="mt-1 text-[11px] text-slate-gray">
                  Total pemindaian kode QR di meja
                </p>
              </div>

              {/* Metric 2 */}
              <div className="rounded-[20px] bg-paper-white border border-stone-200/80 p-5">
                <span className="text-xs text-slate-gray font-medium block">
                  Peluncuran Proyeksi AR
                </span>
                <p className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-ink-black tabular-nums tracking-tight">
                  {summary.ar_launches}
                </p>
                <p className="mt-1 text-[11px] text-slate-gray">
                  Rasio interaksi {arRatio}% dari total kunjungan
                </p>
              </div>

              {/* Metric 3 */}
              <div className="rounded-[20px] bg-paper-white border border-stone-200/80 p-5">
                <span className="text-xs text-slate-gray font-medium block">
                  Meja Terdaftar
                </span>
                <p className="mt-2 font-serif text-3xl sm:text-4xl font-normal text-ink-black tabular-nums tracking-tight">
                  {tables.length}
                </p>
                <p className="mt-1 text-[11px] text-slate-gray">
                  Titik QR aktif di restoran
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[20px] bg-paper-white border border-stone-200/80 p-8 text-center text-xs text-slate-gray">
              Memuat data ringkasan…
            </div>
          )}

          {/* Table Breakdown: Clean, Rules & Alignment */}
          {summary && summary.per_item.length > 0 && (
            <div className="rounded-[20px] border border-stone-200/80 bg-paper-white overflow-hidden">
              <div className="border-b border-stone-100 px-5 py-3.5">
                <h2 className="text-xs font-semibold text-ink-black">
                  Keterlibatan Per Menu
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-[11px] text-slate-gray">
                      <th className="px-5 py-2.5 font-normal">Nama Item</th>
                      <th className="px-5 py-2.5 font-normal text-right">Dilihat</th>
                      <th className="px-5 py-2.5 font-normal text-right">Proyeksi AR</th>
                      <th className="px-5 py-2.5 font-normal text-right">Konversi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {summary.per_item.map((item) => {
                      const itemRatio =
                        item.views > 0
                          ? ((item.ar_launches / item.views) * 100).toFixed(0)
                          : "0";
                      return (
                        <tr key={item.id} className="hover:bg-mist-gray/30">
                          <td className="px-5 py-3 font-medium text-ink-black">
                            {item.name}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-gray tabular-nums">
                            {item.views}
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-ink-black tabular-nums">
                            {item.ar_launches}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-[11px] text-slate-gray tabular-nums">
                            {itemRatio}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Manajemen Menu & Aset 3D */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-stone-200/60 pb-3">
            <div>
              <h2 className="font-serif text-2xl font-normal tracking-tight text-ink-black">
                Daftar Menu & Model 3D
              </h2>
              <p className="mt-0.5 text-xs text-slate-gray">
                Kelola sajian, foto poster 2D, dan file 3D GLB
              </p>
            </div>
          </div>

          {menuErr && (
            <div className="rounded-[16px] border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {menuErr}
            </div>
          )}

          {/* Form Tambah Menu Baru */}
          <div className="rounded-[20px] border border-stone-200/80 bg-paper-white p-6">
            <h3 className="text-xs font-semibold text-ink-black mb-4">
              Tambah Menu Baru
            </h3>
            <form onSubmit={addMenuItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-gray">
                    Nama Makanan / Minuman
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Sate Maranggi 6 Tusuk"
                    required
                    className="rounded-[12px] min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-gray">
                    Kategori
                  </label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Contoh: Makanan Utama, Minuman"
                    required
                    className="rounded-[12px] min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-gray">
                  Keterangan Porsi / Bahan
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ukuran piring 24 cm, disajikan dengan lontong dan sambal kecap..."
                  required
                  className="rounded-[12px] min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-gray">
                    Harga (IDR)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="38000"
                    required
                    className="rounded-[12px] min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-gray">
                    Estimasi Kalori (opsional)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="420"
                    className="rounded-[12px] min-h-[44px]"
                  />
                </div>
              </div>

              {itemErr && (
                <p className="text-xs text-red-600 font-medium">{itemErr}</p>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="w-full sm:w-auto text-xs min-h-[42px] px-6"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {busy ? "Menyimpan…" : "Simpan Menu"}
              </Button>
            </form>
          </div>

          {/* List Menu Items */}
          {!menu ? (
            <div className="rounded-[20px] bg-paper-white p-8 text-center text-xs text-slate-gray">
              Memuat menu…
            </div>
          ) : menu.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-stone-300 p-8 text-center text-xs text-slate-gray">
              Belum ada item menu. Gunakan form di atas untuk menambahkan menu pertama.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menu.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-[20px] border border-stone-200/80 bg-paper-white p-5 transition-all hover:border-stone-300"
                >
                  <div>
                    {/* Item header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[11px] text-slate-gray">
                          {item.category}
                        </span>
                        <h3 className="font-serif text-lg font-normal text-ink-black truncate">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-gray line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-semibold text-ink-black block tabular-nums">
                          {rupiah.format(item.price)}
                        </span>
                        <div className="mt-1">
                          <Badge
                            tone={item.is_available ? "emerald" : "red"}
                            className="text-[10px]"
                          >
                            {item.is_available ? "Tersedia" : "Habis"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Asset preview & status */}
                    <div className="mt-4 flex items-center gap-3 border-t border-stone-100 pt-3 text-xs">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-12 w-12 rounded-[10px] object-cover border border-stone-100"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-mist-gray text-slate-gray text-[10px]">
                          Tanpa foto
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.glb_url ? (
                            <span className="rounded-full bg-mist-gray px-2 py-0.5 font-mono text-[10px] text-ink-black">
                              GLB Siap
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-gray">
                              Belum ada 3D
                            </span>
                          )}

                          <Badge
                            tone={
                              item.status === "ready"
                                ? "emerald"
                                : item.status === "failed"
                                  ? "red"
                                  : "amber"
                            }
                            className="text-[10px]"
                          >
                            {item.status}
                          </Badge>
                        </div>
                        {item.calories_kcal && (
                          <span className="text-[11px] text-slate-gray">
                            {item.calories_kcal} kkal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-stone-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => uploadAsset(item, "image")}
                      className="text-xs min-h-[36px]"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Foto 2D
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => uploadAsset(item, "glb")}
                      className="text-xs min-h-[36px]"
                    >
                      <FileBox className="h-3 w-3 mr-1" />
                      Model 3D
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAvailable(item)}
                      className="text-xs min-h-[36px]"
                    >
                      {item.is_available ? "Set Habis" : "Set Ada"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                      className="text-xs min-h-[36px]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 3 & 4: Tabel Meja & Integrasi POS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kelola Meja */}
          <section className="rounded-[20px] border border-stone-200/80 bg-paper-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif text-lg font-normal text-ink-black">
                  Meja Restoran
                </h3>
                <p className="text-xs text-slate-gray">
                  Daftarkan nomor meja untuk dicetak ke kartu tenda
                </p>
              </div>
              <Link href="/dashboard/qr">
                <Button variant="outline" size="sm" className="text-xs min-h-[36px]">
                  <Printer className="h-3 w-3 mr-1" />
                  Cetak Semua
                </Button>
              </Link>
            </div>

            {tablesErr && (
              <div className="rounded-[12px] border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {tablesErr}
              </div>
            )}

            {/* Tambah Meja */}
            <form onSubmit={addTable} className="flex gap-2">
              <Input
                value={tableCode}
                onChange={(e) => setTableCode(e.target.value)}
                placeholder="Kode meja (contoh: 01, Meja-B)"
                required
                minLength={2}
                maxLength={32}
                pattern="[A-Za-z0-9-]+"
                className="flex-1 rounded-[12px] min-h-[42px]"
              />
              <Button type="submit" size="sm" className="text-xs min-h-[42px] px-4">
                Tambah
              </Button>
            </form>

            {/* List Meja */}
            {tables.length === 0 ? (
              <p className="text-xs text-slate-gray py-4 text-center">
                Belum ada meja terdaftar.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                {tables.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-ink-black tabular-nums">
                        Meja {t.code}
                      </span>
                      <span className="text-[11px] text-slate-gray">
                        /public/{slug}?table={t.code}
                      </span>
                    </div>

                    <a
                      href={`/public/${slug}?table=${encodeURIComponent(t.code)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-gray hover:text-ink-black transition-colors"
                    >
                      <span>Buka</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Integrasi POS & API Keys */}
          <section className="rounded-[20px] border border-stone-200/80 bg-paper-white p-6 space-y-4">
            <div className="border-b border-stone-100 pb-3">
              <h3 className="font-serif text-lg font-normal text-ink-black">
                Integrasi POS
              </h3>
              <p className="text-xs text-slate-gray">
                Sinkronisasi menu & ketersediaan stok via REST API Key
              </p>
            </div>

            {keysErr && (
              <div className="rounded-[12px] border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {keysErr}
              </div>
            )}

            {/* Banner Key Baru */}
            {rawKey && (
              <div className="rounded-[14px] bg-mist-gray p-3.5 space-y-2 border border-stone-200/80">
                <p className="text-[11px] text-slate-gray">
                  API Key baru berhasil dibuat. Kunci ini hanya tampil satu kali:
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-white p-2 font-mono text-xs break-all border border-stone-200 text-ink-black">
                  <span className="flex-1 select-all">{rawKey}</span>
                  <button
                    onClick={copyKey}
                    className="p-1 text-slate-gray hover:text-ink-black cursor-pointer"
                    aria-label="Salin API Key"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tambah API Key Form */}
            <form onSubmit={createKey} className="flex gap-2">
              <Input
                value={keyLabel}
                onChange={(e) => setKeyLabel(e.target.value)}
                placeholder="Label key (contoh: POS Kasir 01)"
                required
                className="flex-1 rounded-[12px] min-h-[42px]"
              />
              <Button type="submit" size="sm" className="text-xs min-h-[42px] px-4">
                Buat Key
              </Button>
            </form>

            {/* List API Keys */}
            {keys === null ? (
              <p className="text-xs text-slate-gray py-4 text-center">
                Memuat API keys…
              </p>
            ) : keys.length === 0 ? (
              <p className="text-xs text-slate-gray py-4 text-center">
                Belum ada API key terdaftar.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                {keys.map((k) => (
                  <li
                    key={k.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <Key className="h-3 w-3 text-slate-gray shrink-0" />
                        <span
                          className={`font-medium ${
                            k.revoked_at ? "text-stone-400 line-through" : "text-ink-black"
                          }`}
                        >
                          {k.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-gray pl-4.5">
                        {k.revoked_at ? (
                          <span className="text-red-600">Dicabut</span>
                        ) : (
                          "Aktif"
                        )}
                        {k.last_used_at &&
                          ` · Dipakai: ${k.last_used_at.slice(0, 10)}`}
                      </p>
                    </div>

                    {!k.revoked_at && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => revokeKey(k.id)}
                        className="min-h-[30px] px-2.5 text-[11px]"
                      >
                        Cabut
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
