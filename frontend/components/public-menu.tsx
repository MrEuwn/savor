"use client";

import Viewer3D from "@/components/viewer3d";
import { Badge } from "@/components/ui";

export type PublicItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  image_url: string | null;
  glb_url: string | null;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function PublicMenu({
  tenantName,
  table,
  items,
}: {
  tenantName: string;
  table: string | null;
  items: PublicItem[];
}) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-stone-900">{tenantName}</h1>
        <p className="text-sm text-stone-600">
          {table ? `Tabel: ${table}` : "Menu"}
        </p>
      </header>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-600">
          Belum ada item tersedia.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
            >
              {item.glb_url ? (
                <Viewer3D src={item.glb_url} poster={item.image_url} name={item.name} />
              ) : item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-56 w-full object-cover"
                />
              ) : null}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-stone-900">{item.name}</h2>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-stone-600">{item.description}</p>
                    )}
                  </div>
                  <p className="whitespace-nowrap font-semibold text-emerald-700">
                    {rupiah.format(item.price)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.category && <Badge>{item.category}</Badge>}
                  {!item.is_available && <Badge tone="red">Sementara Habis</Badge>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
