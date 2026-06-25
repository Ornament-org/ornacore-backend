const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const staffWelcomeTemplate = ({
  fullName,
  email,
  temporaryPassword,
  employeeCode,
  roleName,
  loginUrl,
}) => {
  const safe = {
    fullName: escapeHtml(fullName),
    email: escapeHtml(email),
    temporaryPassword: escapeHtml(temporaryPassword),
    employeeCode: escapeHtml(employeeCode),
    roleName: escapeHtml(roleName),
    loginUrl: escapeHtml(loginUrl),
  };

  return {
    subject: "Your OrnaCore staff account is ready",
    text: [
      `Hello ${fullName},`,
      "",
      "Your OrnaCore Admin Toolbox account has been created.",
      `Employee code: ${employeeCode}`,
      `Role: ${roleName}`,
      `Email: ${email}`,
      `Temporary password: ${temporaryPassword}`,
      `Login: ${loginUrl}`,
      "",
      "You will be required to choose a new password after your first login.",
      "Do not share this email or password with anyone.",
      "",
      "OrnaCore Admin Toolbox",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OrnaCore staff account</title>
  </head>
  <body style="margin:0;background:#f4f1eb;font-family:Arial,sans-serif;color:#20211f">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1eb;padding:32px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e8e3d9;border-radius:16px;overflow:hidden">
            <tr>
              <td style="padding:24px 30px;background:#151715;color:#ffffff">
                <div style="color:#d9a349;font-size:12px;font-weight:700;letter-spacing:2px">ORNACORE</div>
                <div style="margin-top:5px;color:#aaa;font-size:10px;letter-spacing:1.6px">ADMIN TOOLBOX</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 30px">
                <h1 style="margin:0 0 12px;font-size:24px">Welcome to OrnaCore, ${safe.fullName}</h1>
                <p style="margin:0 0 24px;color:#686760;font-size:14px;line-height:1.7">
                  Your staff account has been created. Use the temporary credentials below to sign in.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#faf8f4;border:1px solid #ece6dc;border-radius:10px">
                  <tr><td style="padding:12px 16px;color:#87837c;font-size:12px">Employee code</td><td style="padding:12px 16px;font-size:13px;font-weight:700">${safe.employeeCode}</td></tr>
                  <tr><td style="padding:12px 16px;color:#87837c;font-size:12px;border-top:1px solid #ece6dc">Role</td><td style="padding:12px 16px;font-size:13px;font-weight:700;border-top:1px solid #ece6dc">${safe.roleName}</td></tr>
                  <tr><td style="padding:12px 16px;color:#87837c;font-size:12px;border-top:1px solid #ece6dc">Email</td><td style="padding:12px 16px;font-size:13px;font-weight:700;border-top:1px solid #ece6dc">${safe.email}</td></tr>
                  <tr><td style="padding:12px 16px;color:#87837c;font-size:12px;border-top:1px solid #ece6dc">Temporary password</td><td style="padding:12px 16px;color:#9a6218;font-family:monospace;font-size:15px;font-weight:700;border-top:1px solid #ece6dc">${safe.temporaryPassword}</td></tr>
                </table>
                <div style="margin:24px 0">
                  <a href="${safe.loginUrl}" style="display:inline-block;padding:13px 22px;color:#ffffff;background:#b77b22;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700">Sign in to OrnaCore</a>
                </div>
                <p style="margin:0;padding:14px 16px;color:#745420;background:#fff7e8;border:1px solid #f0dfbf;border-radius:9px;font-size:12px;line-height:1.6">
                  For security, you must create a new password immediately after your first login.
                </p>
                <p style="margin:24px 0 0;color:#929089;font-size:11px;line-height:1.6">
                  If you were not expecting this account, contact your OrnaCore administrator. Never share this email or password.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
};
