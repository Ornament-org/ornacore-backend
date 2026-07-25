import { env } from "../../config/env.js";
import { isMailerConfigured, mailTransport } from "../../config/mailer.js";
import { AppError } from "../../shared/errors/AppError.js";

const senderAddress = () => {
  const from = env.SMTP_FROM || env.MAIL_FROM_ADDRESS;
  const match = from.match(/<([^>]+)>/);
  return match?.[1] || from;
};

export const nodemailerProvider = {
  async send({ to, subject, html, text, fromName, attachments }) {
    if (!isMailerConfigured) {
      throw new AppError("Email provider is not configured", {
        statusCode: 503,
        code: "EMAIL_PROVIDER_NOT_CONFIGURED",
      });
    }

    return mailTransport.sendMail({
      from: {
        name: fromName || env.MAIL_FROM_NAME || "OrnaCore",
        address: senderAddress(),
      },
      to,
      subject,
      html,
      text,
      attachments,
    });
  },
};
