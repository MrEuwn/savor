"use client";

import { useState, useMemo } from "react";
import { Search, Utensils } from "lucide-react";
import Viewer3D from "@/components/viewer3d";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export type PublicItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  calories_kcal?: number | null;
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
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ["Semua", ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        selectedCategory === "Semua" || item.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [items, search, selectedCategory]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-paper-white px-4 py-6 sm:py-8">
      {/* Restaurant Header */}
      <header className="mb-6 border-b border-stone-100 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={28} className="rounded-lg shadow-2xs" />
            <span className="font-serif text-xs font-normal tracking-tight text-ink-black">
              SAVOR
            </span>
          </div>

          {table && (
            <div className="rounded-full bg-mist-gray px-3 py-1 text-xs font-medium text-ink-black tabular-nums">
              Meja {table}
            </div>
          )}
        </div>

        <div className="mt-4">
          <h1 className="font-serif text-3xl font-normal tracking-tight text-ink-black">
            {tenantName}
          </h1>
          <p className="mt-1 text-xs text-slate-gray">
            Pilih sajian untuk memproyeksikan ukuran porsi 3D langsung di atas meja.
          </p>
        </div>
      </header>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-smoke-gray" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari sajian…"
          className="pl-9 min-h-[42px] rounded-[12px] text-xs bg-mist-gray/40 border-stone-200"
          aria-label="Cari sajian"
        />
      </div>

      {/* Category Pills */}
      {categories.length > 2 && (
        <div className="no-scrollbar mb-6 flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1 text-xs transition-all duration-150 cursor-pointer min-h-[32px]",
                selectedCategory === cat
                  ? "bg-ink-black text-paper-white font-medium"
                  : "bg-mist-gray/60 text-slate-gray hover:text-ink-black",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Menu List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-stone-200 p-8 text-center">
          <Utensils className="mx-auto h-6 w-6 text-slate-gray opacity-40" />
          <h2 className="mt-2 font-serif text-sm font-normal text-ink-black">
            Sajian Tidak Ditemukan
          </h2>
          <p className="mt-0.5 text-xs text-slate-gray">
            {search
              ? "Coba gunakan kata kunci pencarian yang lain."
              : "Belum ada item sajian pada kategori ini."}
          </p>
        </div>
      ) : (
        <ul className="space-y-6">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-[20px] border border-stone-200/80 bg-paper-white p-4 shadow-xs"
            >
              {/* Media Container: 3D model viewer with 2D fallback */}
              {item.glb_url ? (
                <div className="mb-4">
                  <Viewer3D
                    src={item.glb_url}
                    poster={item.image_url}
                    name={item.name}
                  />
                </div>
              ) : item.image_url ? (
                <div className="mb-4 overflow-hidden rounded-[16px] bg-mist-gray">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-52 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}

              {/* Menu Details */}
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-gray">
                      {item.category}
                    </span>
                    <h2 className="font-serif text-lg font-normal text-ink-black leading-snug">
                      {item.name}
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-sm text-ink-black tabular-nums">
                      {rupiah.format(item.price)}
                    </span>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-gray leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* Details row */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                  <div className="flex items-center gap-2">
                    {item.is_available ? (
                      <Badge tone="emerald" className="text-[10px]">
                        Tersedia
                      </Badge>
                    ) : (
                      <Badge tone="red" className="text-[10px]">
                        Habis
                      </Badge>
                    )}
                    {item.calories_kcal && (
                      <span className="text-[11px] text-slate-gray">
                        {item.calories_kcal} kkal
                      </span>
                    )}
                  </div>

                  {item.glb_url && (
                    <span className="text-[10px] text-slate-gray font-mono">
                      Skala 1:1
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-stone-100 pt-6 text-center text-[11px] text-slate-gray">
        <p className="font-serif text-xs text-ink-black">MejaAR</p>
        <p className="mt-0.5">Menu 3D & Augmented Reality di Meja Tamu</p>
      </footer>
    </main>
  );
}
