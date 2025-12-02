// utils/mailer.js
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

let transporter = null;
if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log("DEV EMAIL:", { to, subject, html });
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || user,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(to) {
  const subject = "Welcome to BatiTone!";
  const html = `
    <p>Thank you for signing up.</p>
    <p>Your account is ready. You can now log in anytime.</p>
  `;

  await sendMail(to, subject, html);
}

export async function sendPasswordResetEmail(to, link) {
  const subject = "Reset your password";
  const html = `
    <p>Click the link below to reset your password:</p>
    <a href="${link}">${link}</a>
  `;

  await sendMail(to, subject, html);
}
