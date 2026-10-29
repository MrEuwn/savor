"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

type Props = {
  src: string;
  poster?: string | null;
  name: string;
};

export default function Viewer3D({ src, poster, name }: Props) {
  const ref = useRef<any>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [secure, setSecure] = useState(true);

  // model-viewer hanya di browser (custom element, memakai window/self).
  // Muat dinamis saat effect => SSR aman.
  useEffect(() => {
    let cancelled = false;
    setSecure(window.isSecureContext);
    (async () => {
      try {
        if (!customElements.get("model-viewer")) {
          await import("@google/model-viewer");
        }
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const el = ref.current;
    if (!el) return;
    const onError = () => setFailed(true);
    const onLoad = () => setLoaded(true);
    const onARFailed = () => setFailed(true);
    el.addEventListener("error", onError);
    el.addEventListener("load", onLoad);
    el.addEventListener("ar-failed", onARFailed);
    return () => {
      el.removeEventListener("error", onError);
      el.removeEventListener("load", onLoad);
      el.removeEventListener("ar-failed", onARFailed);
    };
  }, [ready]);

  const enterAR = () => {
    const el = ref.current;
    if (!el) return;
    try {
      const p =
        typeof el.requestSceneViewer === "function"
          ? el.requestSceneViewer()
          : typeof el.requestAR === "function"
            ? el.requestAR()
            : undefined;
      if (p && typeof p.catch === "function") p.catch(() => setFailed(true));
    } catch {
      setFailed(true);
    }
  };

  if (failed) {
    return poster ? (
      <img src={poster} alt={name} className="h-64 w-full object-cover" />
    ) : (
      <div className="flex h-64 w-full items-center justify-center bg-stone-100 px-4 text-center text-sm text-stone-500">
        Model 3D tidak dapat dimuat.
      </div>
    );
  }

  const arBlocked = !secure;

  return (
    <div>
      <div className="relative">
        <model-viewer
          ref={ref}
          src={src}
          poster={poster ?? undefined}
          alt={name}
          ar
          ar-modes="webxr scene-viewer quick-look"
          auto-rotate
          camera-controls
          className="h-64 w-full bg-stone-100"
        />
        {!loaded && (
          <div
            className="absolute inset-0 flex items-center justify-center text-sm text-stone-500"
            role="status"
          >
            Memuat model 3D…
          </div>
        )}
      </div>
      <div className="p-3">
        <Button
          className="w-full"
          onClick={enterAR}
          disabled={!loaded || arBlocked}
          aria-label={`Lihat ${name} di meja (AR)`}
        >
          {arBlocked ? "AR butuh HTTPS / localhost" : "Lihat di Meja (AR)"}
        </Button>
        {!loaded && !arBlocked && (
          <p className="mt-2 text-center text-xs text-stone-500">
            AR aktif bila di HP (iOS Quick Look / Android Scene Viewer).
          </p>
        )}
        {arBlocked && (
          <p className="mt-2 text-center text-xs text-amber-700">
            3D tetap bisa dirotasikan di atas. AR "Lihat di Meja" hanya aktif
            melalui HTTPS (atau localhost di laptop) — buka link publik yang
            sama lewat demo online untuk mengaktifkannya.
          </p>
        )}
      </div>
    </div>
  );
}
