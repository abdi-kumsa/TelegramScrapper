/**
 * Thin API client that attaches the JWT token to every authenticated request
 * and surfaces structured errors.
 *
 * In production the API is served from the same origin as the frontend,
 * so we use relative paths. In development we proxy through Vite or hit
 * the Express dev server directly.
 */
const API_BASE = import.meta.env.VITE_API_URL || "";

class ApiClient {
  constructor() {
    this._token = null;
    this._email = null;
  }

  /** Store the JWT and user email, persist to localStorage. */
  setToken(token, email) {
    this._token = token;
    this._email = email || null;
    if (token) {
      localStorage.setItem("tg_token", token);
      if (email) localStorage.setItem("tg_email", email);
    } else {
      localStorage.removeItem("tg_token");
      localStorage.removeItem("tg_email");
    }
  }

  /** Restore a saved token on boot. */
  loadToken() {
    const saved = localStorage.getItem("tg_token");
    if (saved) this._token = saved;
    this._email = localStorage.getItem("tg_email") || null;
    return this._token;
  }

  get isAuthenticated() {
    return !!this._token;
  }

  get userEmail() {
    return this._email;
  }

  // ── low-level request ─────────────────────────────────────────────────────

  async _fetch(path, options = {}) {
    const { body, method = "GET" } = options;

    const headers = { "Content-Type": "application/json" };
    if (this._token) {
      headers["Authorization"] = `Bearer ${this._token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle blob/text downloads
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("text/plain") || ct.includes("application/jsonlines")) {
      if (!res.ok) throw new ApiError("Download failed", "DOWNLOAD_ERROR", res.status);
      const blob = await res.blob();
      return { blob, filename: extractFilename(res) };
    }

    const data = await res.json().catch(() => ({}));

    // Handle 401 globally – clear token
    if (res.status === 401) {
      this.setToken(null);
      throw new ApiError(data.error || "Session expired. Please sign in again.", "UNAUTHORIZED", 401);
    }

    if (!res.ok) {
      throw new ApiError(
        data.message || data.error || "Something went wrong",
        data.error || "UNKNOWN",
        res.status
      );
    }

    return data;
  }

  // ── auth ──────────────────────────────────────────────────────────────────

  async login(email, password) {
    const data = await this._fetch("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    this.setToken(data.token, data.user.email);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  // ── channels ───────────────────────────────────────────────────────────────

  async getChannels() {
    return this._fetch("/api/channels");
  }

  async addChannel(url) {
    return this._fetch("/api/channels", {
      method: "POST",
      body: { url },
    });
  }

  async deleteChannel(id) {
    return this._fetch(`/api/channels/${id}`, { method: "DELETE" });
  }

  async updateChannelStatus(id, status) {
    return this._fetch(`/api/channels/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  }

  // ── exports ────────────────────────────────────────────────────────────────

  async exportTxt() {
    return this._fetch("/api/export/txt");
  }

  async exportJsonl() {
    return this._fetch("/api/export/jsonl");
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function extractFilename(res) {
  const disposition = res.headers.get("content-disposition");
  if (disposition) {
    const match = disposition.match(/filename="?(.+?)"?$/);
    if (match) return match[1];
  }
  return "export";
}

class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// Singleton
const api = new ApiClient();
export default api;
