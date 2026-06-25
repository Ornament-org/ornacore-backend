import { AppError } from "../../shared/errors/AppError.js";

export const smsOtpProvider = {
  channel: "SMS",
  async send() {
    throw new AppError("SMS OTP provider has not been selected yet", {
      statusCode: 501,
      code: "SMS_PROVIDER_NOT_IMPLEMENTED",
    });
  },
};
