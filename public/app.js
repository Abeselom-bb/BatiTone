// public/app.js

// 1) On load, only redirect if the saved token is VALID.
(async () => {
  if (window.API?.token) {
    try {
      await API.get("/api/progress/summary"); // quick validity check
      location.replace("/dashboard.html");
    } catch {
      API.clear(); // bad/expired token → stay on login
    }
  }
})();

// 2) Landing page elements
const reg = document.getElementById("registerForm");
const log = document.getElementById("loginForm");
const toLogin = document.getElementById("toLogin");

// Smooth scroll to login form
if (toLogin) {
  toLogin.addEventListener("click", () =>
    document.getElementById("loginForm")?.scrollIntoView({ behavior: "smooth" })
  );
}

// ---------- REGISTER ----------
if (reg) {
  reg.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(reg).entries());

    try {
      const res = await API.post("/api/auth/register", data);
      alert(res.message || "We sent a verification link. Please check your inbox.");
      location.href = "/check-mail.html";
    } catch (err) {
      console.error("Register error:", err);
      alert(err?.message || "Registration failed.");
    }
  });
}

// ---------- LOGIN ----------
if (log) {
  log.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(log).entries());

    try {
      const r = await API.post("/api/auth/login", data);
      API.setAuth(r.token, r.user);
      location.href = "/dashboard.html";
    } catch (err) {
      console.error("Login error:", err);
      alert(err?.message || "Login failed.");
    }
  });
}
