export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
