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
  const responseText = await response.text();
  let payload: Record<string, unknown> = {};
  if (responseText) {
    try {
      payload = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      if (!response.ok) {
        throw new Error(`Recall API returned ${response.status}. Check the Flask terminal for details.`);
      }
      throw new Error("Recall API returned an unreadable response.");
    }
  }
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : `Recall API request failed (${response.status}).`,
    );
  }
  return payload as T;
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
