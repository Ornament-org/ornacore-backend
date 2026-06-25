import nodemailer from "nodemailer";
import { env } from "./env.js";

export const isMailerConfigured = Boolean(env.SMTP_HOST);
const smtpPassword = env.SMTP_PASSWORD ?? env.SMTP_PASS;

export const mailTransport = isMailerConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      connectionTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeout: env.SMTP_CONNECTION_TIMEOUT_MS,
      socketTimeout: env.SMTP_CONNECTION_TIMEOUT_MS * 2,
      auth: env.SMTP_USER && smtpPassword ? { user: env.SMTP_USER, pass: smtpPassword } : undefined,
    })
  : null;
