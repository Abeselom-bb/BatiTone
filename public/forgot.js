// public/forgot.js
document.addEventListener('DOMContentLoaded', () => {
  const forgotLink = document.getElementById('forgotLink');
  const forgotForm = document.getElementById('forgotForm');
  const forgotMsg = document.getElementById('forgotMsg');

  // reveal the forgot form
  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotForm.style.display = 'block';
    forgotLink.style.display = 'none';
  });

  // send reset e-mail
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = forgotForm.email.value.trim();
    forgotMsg.textContent = 'Sending...';

    const res = await fetch('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const json = await res.json();
    forgotMsg.textContent = json.message;
    if (res.ok) forgotForm.reset();
  });

  // if we are on /?token=... show the reset-password form
  const urlToken = new URLSearchParams(window.location.search).get('token');
  if (urlToken) {
    document.getElementById('resetForm').style.display = 'block';
    document.getElementById('resetForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const password = ev.target.password.value;
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: urlToken, password })
      });
      const json = await res.json();
      document.getElementById('resetMsg').textContent = json.message;
      if (res.ok) setTimeout(() => location.href = '/', 2000);
    });
  }
});