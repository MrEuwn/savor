"use client";

import { useEffect, useRef, useState } from "react";
import { Glasses, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  src: string;
  poster?: string | null;
  name: string;
};

export default function Viewer3D({ src, poster, name }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ref = useRef<any>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [secure, setSecure] = useState(true);

  // Tunda import model-viewer sampai kartu masuk viewport untuk menghemat konteks WebGL browser
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // Model-viewer hanya di client browser (custom element window/self)
  useEffect(() => {
    if (!visible) return;
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
  }, [visible]);

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

  // Fallback 2D bila WebGL / 3D gagal dimuat
  if (failed) {
    return poster ? (
      <img
        src={poster}
        alt={name}
        className="h-64 w-full object-cover rounded-[16px]"
      />
    ) : (
      <div className="flex h-64 w-full items-center justify-center rounded-[16px] bg-mist-gray px-4 text-center text-xs text-slate-gray">
        Model 3D tidak dapat dimuat di perangkat ini.
      </div>
    );
  }

  const arBlocked = !secure;

  return (
    <div ref={wrapRef} className="space-y-3">
      {/* Container model-viewer dengan data-lenis-prevent agar rotasi sentuh tidak memicu scroll Lenis */}
      <div
        data-lenis-prevent="true"
        className="relative h-64 w-full overflow-hidden rounded-[20px] bg-mist-gray/80 touch-pan-y"
      >
        {ready ? (
          <model-viewer
            ref={ref}
            src={src}
            poster={poster ?? undefined}
            alt={name}
            ar
            ar-modes="webxr scene-viewer quick-look"
            auto-rotate
            camera-controls
            shadow-intensity="1"
            className="h-full w-full"
          />
        ) : (
          poster && (
            <img
              src={poster}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )
        )}

        {/* Loading overlay */}
        {ready && !loaded && (
          <div
            className="absolute inset-0 flex items-center justify-center gap-2 bg-mist-gray/60 backdrop-blur-xs text-xs text-slate-gray"
            role="status"
          >
            <RotateCw className="h-4 w-4 animate-spin text-ink-black" />
            <span>Memuat model 3D…</span>
          </div>
        )}

        {/* Hint banner rotasi */}
        {loaded && (
          <div className="absolute bottom-2 left-2 rounded-full bg-paper-white/80 backdrop-blur-md px-2.5 py-1 text-[10px] text-slate-gray shadow-xs pointer-events-none">
            Geser untuk putar 360°
          </div>
        )}
      </div>

      {/* Action button "Lihat di Meja (AR)" dengan touch target min 44px */}
      <div>
        <Button
          className="w-full min-h-[44px] flex items-center justify-center gap-2 text-xs"
          onClick={enterAR}
          disabled={!loaded || arBlocked}
          aria-label={`Lihat porsi ${name} di meja dengan Augmented Reality`}
        >
          <Glasses className="h-4 w-4" />
          <span>
            {arBlocked ? "AR butuh HTTPS / Localhost" : "Lihat di Meja (AR)"}
          </span>
        </Button>

        {!loaded && !arBlocked && (
          <p className="mt-1.5 text-center text-[11px] text-slate-gray">
            Aktif di smartphone (iOS Quick Look / Android Scene Viewer).
          </p>
        )}
        {arBlocked && (
          <p className="mt-1.5 text-center text-[11px] text-amber-700">
            3D tetap bisa dirotasikan. Mode AR kamera meja membutuhkan koneksi
            HTTPS.
          </p>
        )}
      </div>
    </div>
  );
}
