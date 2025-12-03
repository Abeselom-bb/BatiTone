// utils/mailer.js
import nodemailer from "nodemailer";

// Read SMTP settings from environment variables
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

let transporter = null;

if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587/25
    auth: { user, pass },
  });

  console.log("MAILER: Using real SMTP transporter", {
    host,
    port,
    hasUser: !!user,
    hasPass: !!pass,
  });
} else {
  console.log(
    "MAILER: NO SMTP CONFIG. Emails will NOT be sent, only logged.",
    { host, port, hasUser: !!user, hasPass: !!pass }
  );
}

async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log("DEV EMAIL (no SMTP):", { to, subject, html });
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || user,
      to,
      subject,
      html,
    });
    console.log("EMAIL SENT:", { to, subject, messageId: info.messageId });
  } catch (err) {
    console.error("EMAIL ERROR:", err);
  }
}

export async function sendVerificationEmail(to) {
  const subject = "Welcome to BatiTone!";
  const html = `
    <p>Hi,</p>
    <p>Thank you for registering for <strong>BatiTone</strong>.</p>
    <p>Your account is ready. You can now log in anytime.</p>
  `;
  await sendMail(to, subject, html);
}

export async function sendPasswordResetEmail(to, link) {
  const subject = "Reset your BatiTone password";
  const html = `
    <p>We received a request to reset your BatiTone password.</p>
    <p>Click the link below to choose a new password:</p>
    <p><a href="${link}">${link}</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;
  await sendMail(to, subject, html);
}
