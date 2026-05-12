const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const resp = await fetch(`${API_URL}${path}`, { ...options, signal: controller.signal });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({ detail: resp.statusText }));
      const err = new Error(body.detail || `HTTP ${resp.status}`);
      err.status = resp.status;
      throw err;
    }
    return resp.json();
  } catch (err) {
    if (err.name === "AbortError") {
      const timeout = new Error("Request timed out");
      timeout.status = 408;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTrades(limit = 20) {
  return apiFetch(`/trades?limit=${limit}`);
}

export async function fetchPortfolio() {
  return apiFetch("/portfolio");
}

export async function fetchAgentStatus() {
  return apiFetch("/agent/status");
}

export async function fetchChart() {
  try {
    return await apiFetch("/chart");
  } catch {
    return [];
  }
}

export async function closePosition(instrument) {
  return apiFetch(`/positions/close/${instrument}`, { method: "POST" });
}
