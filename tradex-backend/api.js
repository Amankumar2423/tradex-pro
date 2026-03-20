// ─── TradeX Pro API Service ───────────────────────────────────────────────────
// Place this file in: tradex-pro/src/api.js
// This connects your React frontend to the Node.js backend

const BASE_URL = "https://tradex-pro.onrender.com/api";

// Get token from localStorage
const getToken = () => localStorage.getItem("tradex_token");
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: async (name, email, password) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (data.token) localStorage.setItem("tradex_token", data.token);
    return data;
  },

  login: async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) localStorage.setItem("tradex_token", data.token);
    return data;
  },

  logout: () => localStorage.removeItem("tradex_token"),

  me: async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, { headers: getHeaders() });
    return res.json();
  },
};

// ─── STOCKS ───────────────────────────────────────────────────────────────────
export const stocksAPI = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/stocks`);
    return res.json();
  },

  getOne: async (symbol) => {
    const res = await fetch(`${BASE_URL}/stocks/${symbol}`);
    return res.json();
  },
};

// ─── PORTFOLIO ────────────────────────────────────────────────────────────────
export const portfolioAPI = {
  get: async () => {
    const res = await fetch(`${BASE_URL}/portfolio`, { headers: getHeaders() });
    return res.json();
  },
};

// ─── TRADES ───────────────────────────────────────────────────────────────────
export const tradeAPI = {
  execute: async (symbol, type, quantity, orderType = "market") => {
    const res = await fetch(`${BASE_URL}/trade`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ symbol, type, quantity, orderType }),
    });
    return res.json();
  },
};

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
export const transactionsAPI = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/transactions`, { headers: getHeaders() });
    return res.json();
  },
};

// ─── WATCHLIST ────────────────────────────────────────────────────────────────
export const watchlistAPI = {
  get: async () => {
    const res = await fetch(`${BASE_URL}/watchlist`, { headers: getHeaders() });
    return res.json();
  },

  add: async (symbol) => {
    const res = await fetch(`${BASE_URL}/watchlist/${symbol}`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },

  remove: async (symbol) => {
    const res = await fetch(`${BASE_URL}/watchlist/${symbol}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const ordersAPI = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/orders`, { headers: getHeaders() });
    return res.json();
  },

  place: async (symbol, tradeType, orderType, quantity, triggerPrice) => {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ symbol, tradeType, orderType, quantity, triggerPrice }),
    });
    return res.json();
  },

  cancel: async (id) => {
    const res = await fetch(`${BASE_URL}/orders/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },
};

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
export const leaderboardAPI = {
  get: async () => {
    const res = await fetch(`${BASE_URL}/leaderboard`);
    return res.json();
  },
};
