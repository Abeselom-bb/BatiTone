// utils/mailer.js – DEV STUB: no real emails, just logs

export async function sendVerificationEmail(to, link) {
  console.log("DEV verification email:", { to, link });
}

export async function sendPasswordResetEmail(to, link) {
  console.log("DEV password reset email:", { to, link });
}
