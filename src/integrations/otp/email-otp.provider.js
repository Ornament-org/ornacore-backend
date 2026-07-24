import { nodemailerProvider } from "../mail/nodemailer.provider.js";
import { storeSettingsService } from "../../modules/settings/store-settings.service.js";

const DEFAULT_BRAND_NAME = "OrnaCore";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const getBrandName = async () => {
  try {
    const settings = await storeSettingsService.get();
    return settings.displayName || settings.businessName || DEFAULT_BRAND_NAME;
  } catch {
    return DEFAULT_BRAND_NAME;
  }
};

const renderText = ({ brandName, otp, expiresInMinutes }) => [
  `${brandName} verification code`,
  "",
  `Your verification code is ${otp}.`,
  `It expires in ${expiresInMinutes} minutes.`,
  "",
  "If you did not request this code, you can ignore this email.",
].join("\n");

const renderHtml = ({ brandName, otp, expiresInMinutes }) => {
  const safeBrand = escapeHtml(brandName);
  const safeOtp = escapeHtml(otp);
  const safeExpires = escapeHtml(expiresInMinutes);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeBrand} verification code</title>
  </head>
  <body style="margin:0;background:#f6f0e6;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#24180b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border-collapse:collapse;background:#100d09;border-radius:18px;overflow:hidden;border:1px solid #d8a63c;box-shadow:0 18px 48px rgba(56,35,8,0.18);">
            <tr>
              <td style="padding:26px 28px 14px;text-align:center;background:linear-gradient(135deg,#17110b,#080706);">
                <div style="display:inline-block;width:54px;height:54px;border-radius:50%;background:#d99a22;color:#17110b;line-height:54px;font-size:26px;font-weight:900;">O</div>
                <h1 style="margin:14px 0 4px;color:#fff8ea;font-size:22px;line-height:1.25;font-weight:800;">${safeBrand}</h1>
                <p style="margin:0;color:#cdbfaa;font-size:13px;line-height:1.5;">Secure verification code</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 8px;background:#100d09;">
                <p style="margin:0 0 16px;color:#e8ddcb;font-size:15px;line-height:1.6;">Use this code to continue. For your security, do not share it with anyone.</p>
                <div style="border:1px solid rgba(216,166,60,0.55);border-radius:16px;background:#1b140c;padding:22px 16px;text-align:center;">
                  <div style="color:#b7a895;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;">Verification Code</div>
                  <div style="margin-top:10px;color:#ffc247;font-size:42px;line-height:1;font-weight:900;letter-spacing:8px;">${safeOtp}</div>
                  <div style="margin-top:14px;color:#cdbfaa;font-size:13px;line-height:1.5;">Expires in ${safeExpires} minutes</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 28px;background:#100d09;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#251b10;border-radius:12px;border-left:4px solid #d99a22;">
                  <tr>
                    <td style="padding:12px 14px;color:#cdbfaa;font-size:12px;line-height:1.55;">
                      If you did not request this code, you can safely ignore this email.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px;background:#0a0806;color:#8f8374;text-align:center;font-size:11px;line-height:1.5;">
                This message was sent by ${safeBrand}.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const emailOtpProvider = {
  channel: "EMAIL",
  async send({ destination, otp, expiresInMinutes }) {
    const brandName = await getBrandName();

    return nodemailerProvider.send({
      to: destination,
      fromName: brandName,
      subject: `Your ${brandName} verification code`,
      text: renderText({ brandName, otp, expiresInMinutes }),
      html: renderHtml({ brandName, otp, expiresInMinutes }),
    });
  },
};
