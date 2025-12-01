// public/api.js

const API = (() => {
  const base = ""; // same origin
  let token = localStorage.getItem("token") || null;
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

 async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const err = new Error("unauthorized");
    err.code = 401;
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

  return {
    get token() {
      return token;
    },
    get user() {
      return user;
    },

    async get(path) {
      return request("GET", path);
    },
    async post(path, body) {
      return request("POST", path, body);
    },

    setAuth(t, u) {
      token = t;
      user = u;
      localStorage.setItem("token", t);
      localStorage.setItem("user", JSON.stringify(u));
    },

    clear() {
      token = null;
      user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  };
})();
