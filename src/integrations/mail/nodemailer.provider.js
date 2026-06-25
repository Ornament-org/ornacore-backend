import { env } from "../../config/env.js";
import { isMailerConfigured, mailTransport } from "../../config/mailer.js";
import { AppError } from "../../shared/errors/AppError.js";

export const nodemailerProvider = {
  async send({ to, subject, html, text }) {
    if (!isMailerConfigured) {
      throw new AppError("Email provider is not configured", {
        statusCode: 503,
        code: "EMAIL_PROVIDER_NOT_CONFIGURED",
      });
    }

    return mailTransport.sendMail({
      from: env.SMTP_FROM || `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
      text,
    });
  },
};
