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
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Menu tidak dapat dimuat</h1>
        <p className="text-sm text-stone-600">Silakan coba lagi sebentar lagi.</p>
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
