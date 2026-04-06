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
