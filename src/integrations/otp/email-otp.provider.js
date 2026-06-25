import { nodemailerProvider } from "../mail/nodemailer.provider.js";

export const emailOtpProvider = {
  channel: "EMAIL",
  send({ destination, otp, expiresInMinutes }) {
    return nodemailerProvider.send({
      to: destination,
      subject: "Your OrnaCore verification code",
      text: `Your verification code is ${otp}. It expires in ${expiresInMinutes} minutes.`,
      html: `<p>Your verification code is <strong>${otp}</strong>.</p><p>It expires in ${expiresInMinutes} minutes.</p>`,
    });
  },
};
