const API_KEY = 'tico_api_base';
const TOKEN_KEY = 'tico_token';
const USER_KEY = 'tico_user';

export const storage = {
  getApiBase() {
    return localStorage.getItem(API_KEY) || '/api/v1';
  },
  setApiBase(value) {
    localStorage.setItem(API_KEY, value || '/api/v1');
  },
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  },
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token || '');
    localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiClient {
  constructor() {
    this.base = storage.getApiBase();
  }

  setBase(base) {
    this.base = base || '/api/v1';
    storage.setApiBase(this.base);
  }

  headers(extra = {}) {
    const token = storage.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.base}${path}`, {
      ...options,
      headers: this.headers(options.headers || {}),
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(data.detail || data.message || `Erro ${response.status}`);
    }

    return data;
  }

  get(path) {
    return this.request(path);
  }

  post(path, body) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body || {}) });
  }

  patch(path, body) {
    return this.request(path, { method: 'PATCH', body: JSON.stringify(body || {}) });
  }
}

export const api = new ApiClient();
