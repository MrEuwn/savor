// Server-only (SSR fetches page.tsx pakai ini, absolute ke backend).
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// Browser (client) pakai relative "/api" → di-proxy Next ke backend,
// sehingga pengunjung HP di balik tunnel tidak menjangkau IP laptop.
const API_BASE_B = "/api";

const KEY = "savor";

export type Auth = {
  access_token: string;
  refresh_token: string;
  tenant: { slug: string; name: string };
  role: string;
};

export function getAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Auth) : null;
  } catch {
    return null;
  }
}

export function saveAuth(a: Auth) {
  localStorage.setItem(KEY, JSON.stringify(a));
}

export function clearAuth() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function errMsg(e: unknown): string {
  return e instanceof Error && e.message
    ? e.message
    : "Terjadi kesalahan. Silakan coba lagi.";
}

export class AuthError extends Error {}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const auth = getAuth();
  if (!auth?.refresh_token) return false;
  try {
    const res = await fetch(`${API_BASE_B}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: auth.refresh_token }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    saveAuth({
      ...auth,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const auth = getAuth();
  const doRequest = (token?: string) => {
    const headers = new Headers(init.headers as HeadersInit | undefined);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("content-type") && typeof init.body === "string")
      headers.set("content-type", "application/json");
    return fetch(`${API_BASE_B}${path}`, { ...init, headers });
  };

  const isAuthPath = path.startsWith("/auth/");
  let res = await doRequest(auth?.access_token);

  if (res.status === 401 && !isAuthPath && auth?.refresh_token) {
    // Refresh sekali (dedup antar panggilan konkuren), lalu retry 1x.
    const ok = await (refreshPromise ??=
      tryRefresh().finally(() => {
        refreshPromise = null;
      }));
    if (ok) {
      const renewed = getAuth();
      if (renewed) res = await doRequest(renewed.access_token);
    }
  }

  if (res.status === 401 && !isAuthPath) {
    clearAuth();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login";
    }
    throw new AuthError("Sesi berakhir. Silakan masuk kembali.");
  }

  if (!res.ok) {
    let message = `Permintaan gagal (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (data?.error?.message) message = data.error.message;
    } catch {
      // body bukan JSON
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
