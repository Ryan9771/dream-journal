import { getIdToken } from "./firebase";

const API_URL = process.env.REACT_APP_API_URL || "";

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getIdToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Something went wrong.");
  return payload;
}

export const dreamApi = {
  list: (month?: string) => api<{ dreams: unknown[] }>(`/api/dreams${month ? `?month=${month}` : ""}`),
  create: (dream: { date: string; body: string; contentHtml?: string; title: string; mood: string }) =>
    api<{ dream: unknown }>("/api/dreams", { method: "POST", body: JSON.stringify(dream) }),
  update: (id: string, dream: Record<string, unknown>) =>
    api<{ dream: unknown }>(`/api/dreams/${id}`, { method: "PATCH", body: JSON.stringify(dream) }),
  insight: (id: string) =>
    api<{ insight: unknown; title?: string; cached: boolean }>(`/api/dreams/${id}/insight`, { method: "POST" }),
};
