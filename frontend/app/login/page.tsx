"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, saveAuth, errMsg } from "@/lib/api";
import { Button } from "@/components/ui";

const inputCls =
  "min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const tabCls = (active: boolean) =>
    `min-h-9 rounded-lg text-sm font-medium transition-colors ${
      active ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
    }`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-center text-2xl font-semibold">SAVOR</h1>
      <p className="mb-6 mt-1 text-center text-sm text-stone-600">
        Menu digital dengan Augmented Reality
      </p>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div
          className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1"
          role="tablist"
          aria-label="Pilih mode masuk atau daftar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={tabCls(mode === "login")}
            onClick={() => setMode("login")}
          >
            Masuk
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={tabCls(mode === "register")}
            onClick={() => setMode("register")}
          >
            Daftar
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama usaha"
                aria-label="Nama usaha"
                required
              />
              <input
                className={inputCls}
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Slug (opsional, mis. kafe-senja)"
                aria-label="Slug tenant (opsional)"
              />
            </>
          )}
          <input
            className={inputCls}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            required
          />
          <input
            className={inputCls}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kata sandi"
            aria-label="Kata sandi"
            required
          />
          {err && (
            <p className="text-sm text-red-700" role="alert">
              {err}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar"}
          </Button>
        </form>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setEmail("demo@savor.id");
              setPassword("SAVOR-2026!");
            }}
            className="mt-3 w-full rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-600 transition-colors hover:border-emerald-500 hover:text-emerald-700"
          >
            Gunakan akun demo (demo@savor.id)
          </button>
        )}
      </div>
    </main>
  );
}
