const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchTrades(limit = 20) {
  const resp = await fetch(`${API_URL}/trades?limit=${limit}`);
  if (!resp.ok) throw new Error("Failed to fetch trades");
  return resp.json();
}

export async function fetchPortfolio() {
  const resp = await fetch(`${API_URL}/portfolio`);
  if (!resp.ok) throw new Error("Failed to fetch portfolio");
  return resp.json();
}

export async function fetchAgentStatus() {
  const resp = await fetch(`${API_URL}/agent/status`);
  if (!resp.ok) throw new Error("Failed to fetch status");
  return resp.json();
}

export async function fetchChart() {
  const resp = await fetch(`${API_URL}/chart`);
  if (!resp.ok) return [];
  return resp.json();
}

export async function closePosition(instrument) {
  const resp = await fetch(`${API_URL}/positions/close/${instrument}`, {
    method: "POST",
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || "Failed to close position");
  }
  return resp.json();
}
