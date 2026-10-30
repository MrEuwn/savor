"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch, saveAuth, errMsg } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body =
        mode === "login"
          ? { email, password }
          : { name, email, password, ...(slug ? { slug } : {}) };
      const res = await apiFetch<{
        access_token: string;
        refresh_token: string;
        tenant: { slug: string; name: string };
        role: string;
      }>(
        mode === "login" ? "/auth/login" : "/auth/register-tenant",
        { method: "POST", body: JSON.stringify(body) },
      );
      saveAuth({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        tenant: { slug: res.tenant.slug, name: res.tenant.name },
        role: res.role,
      });
      router.push("/dashboard");
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  const useDemoAccount = () => {
    setEmail("demo@savor.id");
    setPassword("SAVOR-2026!");
  };

  return (
    <main className="min-h-screen w-full bg-paper-white selection:bg-blush-peach selection:text-sienna-brown">
      {/* Responsive Split Container */}
      <div className="flex min-h-screen w-full flex-col lg:grid lg:grid-cols-12">
        {/* Kolom Kiri: Visual 3D Background & Headline */}
        <section className="relative flex min-h-[320px] sm:min-h-[400px] lg:min-h-screen lg:col-span-6 xl:col-span-6 flex-col justify-between overflow-hidden p-6 sm:p-10 lg:p-12 xl:p-16 text-paper-white">
          {/* Background 3D Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/auth-3d-bg.jpg"
              alt="Visualisasi 3D SAVOR"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center brightness-[0.88] contrast-[1.08]"
            />
            {/* Subtle dark gradient overlay untuk legibilitas teks */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25" />
          </div>

          {/* Top Brand / Quote Tag */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-medium tracking-wider uppercase text-white/90 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>3D & AR Portions</span>
            </div>
          </div>

          {/* Bottom Hero Typography (Fluid & Responsive, auto-aligned to bottom) */}
          <div className="relative z-10 mt-auto pt-10 lg:pt-16">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-4xl xl:text-5xl font-normal leading-[1.15] tracking-tight text-paper-white [text-wrap:balance]">
              Porsi Nyata
              <br />
              Sebelum Dipesan
            </h1>
            <p className="mt-3.5 max-w-md text-xs sm:text-sm md:text-base text-stone-200/90 leading-relaxed font-sans">
              Tamu memproyeksikan skala 1:1 makanan langsung di atas meja
              melalui kamera ponsel. Tanpa instalasi aplikasi.
            </p>
          </div>
        </section>

        {/* Kolom Kanan: Clean Form Auth */}
        <section className="flex flex-1 flex-col justify-between bg-paper-white px-6 py-8 sm:px-10 sm:py-12 lg:col-span-6 xl:col-span-6 lg:min-h-screen lg:px-12 xl:px-16">
          {/* Top Logo / Brand Header */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2.5">
              <Logo size={28} className="rounded-lg shadow-xs" />
              <span className="font-serif text-base font-normal tracking-tight text-ink-black">
                SAVOR
              </span>
            </div>
          </div>

          {/* Center Form Section */}
          <div className="mx-auto my-auto w-full max-w-sm py-6 sm:py-8">
            {/* Header Titles */}
            <div className="mb-6 text-center lg:text-left">
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-ink-black">
                {mode === "login" ? "Selamat Datang" : "Daftarkan Restoran"}
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-gray">
                {mode === "login"
                  ? "Masukkan email dan kata sandi akun restoran Anda."
                  : "Mulai kelola menu AR dan integrasi meja restoran Anda."}
              </p>
            </div>

            {/* Error Alert */}
            {err && (
              <div
                className="mb-5 rounded-[14px] border border-red-200 bg-red-50/80 p-3 text-xs text-red-800 leading-normal"
                role="alert"
              >
                {err}
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={submit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="restaurant-name"
                      className="block text-xs font-medium text-ink-black"
                    >
                      Nama Restoran / Usaha
                    </label>
                    <Input
                      id="restaurant-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama restoran Anda"
                      required
                      autoFocus={mode === "register"}
                      className="bg-stone-50/70 border-stone-200/90 rounded-[14px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="restaurant-slug"
                      className="block text-xs font-medium text-ink-black"
                    >
                      Slug Menu Publik{" "}
                      <span className="text-slate-gray font-normal">
                        (opsional)
                      </span>
                    </label>
                    <Input
                      id="restaurant-slug"
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-"),
                        )
                      }
                      placeholder="kopinusantara"
                      pattern="[a-z0-9-]+"
                      className="bg-stone-50/70 border-stone-200/90 rounded-[14px]"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-ink-black"
                >
                  Email
                </label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  autoComplete="email"
                  autoFocus={mode === "login"}
                  className="bg-stone-50/70 border-stone-200/90 rounded-[14px]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-ink-black"
                  >
                    Kata Sandi
                  </label>
                  {mode === "login" && (
                    <span className="text-[11px] text-slate-gray hover:text-ink-black cursor-pointer">
                      Lupa kata sandi?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    className="bg-stone-50/70 border-stone-200/90 rounded-[14px] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-gray hover:text-ink-black p-1 cursor-pointer"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me checkbox */}
              {mode === "login" && (
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-ink-black focus:ring-ink-black accent-ink-black cursor-pointer"
                  />
                  <label
                    htmlFor="remember-me"
                    className="text-xs text-slate-gray cursor-pointer select-none"
                  >
                    Ingat saya di perangkat ini
                  </label>
                </div>
              )}

              {/* Submit CTA button */}
              <Button
                type="submit"
                disabled={busy}
                className="mt-3 w-full min-h-[48px] rounded-[14px] bg-ink-black text-paper-white hover:bg-ink-black/90 text-sm font-medium transition-all"
              >
                {busy
                  ? "Memproses..."
                  : mode === "login"
                    ? "Masuk"
                    : "Daftar Akun"}
              </Button>

              {/* Quick Demo Account Button (from origin/main) */}
              {mode === "login" && (
                <button
                  type="button"
                  onClick={useDemoAccount}
                  className="w-full rounded-[14px] border border-dashed border-stone-300 py-2.5 text-xs text-slate-gray transition-colors hover:border-ink-black hover:text-ink-black cursor-pointer"
                >
                  Gunakan akun demo (demo@savor.id)
                </button>
              )}
            </form>
          </div>

          {/* Bottom Switch Mode Link */}
          <div className="mt-6 text-center text-xs text-slate-gray">
            {mode === "login" ? (
              <p>
                Belum memiliki akun restoran?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setErr("");
                  }}
                  className="font-semibold text-ink-black underline underline-offset-4 hover:opacity-80 cursor-pointer ml-1"
                >
                  Daftar Sekarang
                </button>
              </p>
            ) : (
              <p>
                Sudah memiliki akun?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErr("");
                  }}
                  className="font-semibold text-ink-black underline underline-offset-4 hover:opacity-80 cursor-pointer ml-1"
                >
                  Masuk di Sini
                </button>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
