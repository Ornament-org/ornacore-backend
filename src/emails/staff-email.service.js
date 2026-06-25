import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import db from "../database/models/InitializeModels.js";
import { nodemailerProvider } from "../integrations/mail/nodemailer.provider.js";
import { staffWelcomeTemplate } from "./templates/staff-welcome.template.js";

const safeFailureReason = (error) =>
  String(error?.message || "Email delivery failed").slice(0, 2000);

export const staffEmailService = {
  async sendWelcome({
    user,
    fullName,
    employeeCode,
    roleName,
    temporaryPassword,
    isResend = false,
  }) {
    const template = staffWelcomeTemplate({
      fullName,
      email: user.email,
      temporaryPassword,
      employeeCode,
      roleName,
      loginUrl: `${env.ADMIN_APP_URL.replace(/\/$/, "")}/login`,
    });
    const notification = await db.Notification.create({
      userId: user.id,
      eventType: isResend ? "STAFF_INVITATION_RESENT" : "STAFF_ACCOUNT_CREATED",
      channel: "EMAIL",
      title: template.subject,
      body: `Staff account credentials ${isResend ? "resent" : "created"} for ${employeeCode}`,
      payload: {
        employeeCode,
        roleName,
        recipient: user.email,
      },
      status: "PENDING",
    });

    try {
      const result = await nodemailerProvider.send({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      await notification.update({
        status: "SENT",
        sentAt: new Date(),
        failureReason: null,
        payload: {
          ...notification.payload,
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
          smtpResponse: result.response,
        },
      });
      logger.info(
        "Staff credentials email accepted by SMTP provider",
        {
          userId: user.id,
          notificationId: notification.id,
          eventType: notification.eventType,
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
        },
      );
      return { status: "SENT", messageId: result.messageId };
    } catch (error) {
      const failureReason = safeFailureReason(error);
      await notification.update({
        status: "FAILED",
        failureReason,
      });
      logger.error(
        "Staff welcome email delivery failed",
        {
          error,
          userId: user.id,
          notificationId: notification.id,
          eventType: notification.eventType,
        },
      );
      return { status: "FAILED", failureReason };
    }
  },
};
