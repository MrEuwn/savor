"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, QrCode } from "lucide-react";
import { apiFetch, getAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

type TableCode = { id: number; code: string };

type TableQR = {
  id: number;
  code: string;
  url: string;
  dataUrl: string;
};

export default function PrintQrPage() {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("Restoran");
  const [tables, setTables] = useState<TableCode[]>([]);
  const [qrList, setQrList] = useState<TableQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    setSlug(auth.tenant.slug);
    setRestaurantName(auth.tenant.name || auth.tenant.slug);

    (async () => {
      try {
        const fetchedTables = await apiFetch<TableCode[]>("/tables");
        setTables(fetchedTables);

        const origin =
          process.env.NEXT_PUBLIC_PUBLIC_BASE?.replace(/\/$/, "") ||
          window.location.origin;

        const { toDataURL } = await import("qrcode");

        const qrs = await Promise.all(
          fetchedTables.map(async (t) => {
            const url = `${origin}/public/${auth.tenant.slug}?table=${encodeURIComponent(t.code)}`;
            const dataUrl = await toDataURL(url, {
              margin: 1,
              width: 320,
              color: {
                dark: "#17191c",
                light: "#ffffff",
              },
            });
            return {
              id: t.id,
              code: t.code,
              url,
              dataUrl,
            };
          }),
        );
        setQrList(qrs);
      } catch (e: any) {
        setErr(e.message || "Gagal memuat data meja.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-white text-slate-gray">
        <p className="font-sans text-xs">Menyiapkan kartu QR meja…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-white text-ink-black">
      {/* Top action bar (disembunyikan saat cetak) */}
      <header className="no-print sticky top-0 z-30 border-b border-stone-200/70 bg-paper-white/95 backdrop-blur-md px-6 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-paper-white px-3.5 py-1.5 text-xs text-ink-black hover:bg-mist-gray/60 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali</span>
            </Link>
            <Logo size={32} className="rounded-lg shadow-xs" />
            <div>
              <h1 className="font-serif text-base font-normal text-ink-black">
                Kartu QR Meja
              </h1>
              <p className="text-[11px] text-slate-gray">
                {restaurantName} · {tables.length} Meja
              </p>
            </div>
          </div>

          <Button
            onClick={handlePrint}
            disabled={tables.length === 0}
            className="flex items-center gap-1.5 text-xs min-h-[36px] px-4"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Kartu</span>
          </Button>
        </div>
      </header>

      {/* Main Print Container */}
      <main className="mx-auto max-w-5xl p-6 sm:p-10">
        {err && (
          <div className="no-print mb-6 rounded-[14px] border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {err}
          </div>
        )}

        {tables.length === 0 ? (
          <div className="no-print rounded-[20px] border border-dashed border-stone-300 p-12 text-center">
            <QrCode className="mx-auto h-8 w-8 text-slate-gray opacity-40" />
            <h2 className="mt-3 font-serif text-base font-normal">
              Belum Ada Meja Terdaftar
            </h2>
            <p className="mt-1 text-xs text-slate-gray">
              Tambahkan nomor meja terlebih dahulu di dashboard.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex rounded-full bg-ink-black px-5 py-2 text-xs text-paper-white hover:bg-ink-black/90"
            >
              Ke Dashboard
            </Link>
          </div>
        ) : (
          <div>
            {/* Grid Kartu QR Meja (Print Ready) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-6">
              {qrList.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col items-center justify-between rounded-[20px] border border-stone-200/90 bg-paper-white p-7 text-center shadow-xs print:rounded-none print:border print:border-black/30 print:p-6 print:shadow-none break-inside-avoid"
                >
                  {/* Brand Header */}
                  <div className="w-full flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Logo size={24} className="rounded" />
                      <span className="font-serif text-xs font-normal tracking-tight">
                        SAVOR
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-gray">
                      {restaurantName}
                    </span>
                  </div>

                  {/* QR Image & Table Code */}
                  <div className="my-6 flex flex-col items-center">
                    <div className="p-2 border border-stone-200/80 rounded-[16px] print:border-none">
                      <img
                        src={item.dataUrl}
                        alt={`QR Code Meja ${item.code}`}
                        className="h-44 w-44 object-contain"
                      />
                    </div>
                    <div className="mt-3">
                      <span className="text-[11px] text-slate-gray block">
                        Nomor Meja
                      </span>
                      <h2 className="font-serif text-3xl font-normal tracking-tight text-ink-black">
                        {item.code}
                      </h2>
                    </div>
                  </div>

                  {/* Instruction */}
                  <div className="w-full rounded-[12px] bg-mist-gray/70 p-3 text-center print:bg-transparent print:border print:border-stone-300">
                    <p className="text-xs font-medium text-ink-black">
                      Pindai untuk melihat menu 3D di meja
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-gray">
                      Buka kamera ponsel Anda · Tanpa unduh aplikasi
                    </p>
                  </div>

                  {/* URL */}
                  <p className="mt-3 text-[10px] font-mono text-slate-gray break-all">
                    {item.url}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
