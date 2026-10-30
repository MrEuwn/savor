import { notFound } from "next/navigation";
import { API_BASE } from "@/lib/api";
import PublicMenu from "@/components/public-menu";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string | string[] }>;
};

export default async function PublicMenuPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const table = typeof sp.table === "string" && sp.table ? sp.table : null;

  let data: { tenant_name?: string; items?: any[] } | null = null;
  let status: number | null = null;
  try {
    const qs = table ? `?table=${encodeURIComponent(table)}` : "";
    const res = await fetch(
      `${API_BASE}/public/${encodeURIComponent(slug)}/menu${qs}`,
      { cache: "no-store" },
    );
    status = res.status;
    if (res.ok) data = await res.json();
  } catch {
    // backend tidak terjangkau
  }

  if (status === 404) notFound();

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center bg-paper-white px-6 py-16 text-center">
        <div className="rounded-[24px] bg-mist-gray p-8">
          <h1 className="font-serif text-xl font-normal text-ink-black">
            Menu Tidak Dapat Dimuat
          </h1>
          <p className="mt-2 text-xs text-slate-gray">
            Layanan restoran sedang tidak dapat dijangkau. Silakan hubungi pelayan
            atau coba lagi beberapa saat lagi.
          </p>
        </div>
      </main>
    );
  }

  return (
    <PublicMenu
      tenantName={data.tenant_name || slug}
      table={table}
      items={data.items ?? []}
    />
  );
}
