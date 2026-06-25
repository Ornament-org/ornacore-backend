import { env } from "../src/config/env.js";
import db from "../src/database/models/InitializeModels.js";
import { superAdminService } from "../src/modules/auth/super-admin.service.js";

const validateInput = () => {
  const email = env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.SUPER_ADMIN_PASSWORD;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Set a valid SUPER_ADMIN_EMAIL in .env");
  }

  if (
    !password ||
    password.length < 8 ||
    password.length > 72 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new Error(
      "SUPER_ADMIN_PASSWORD must be 8-72 characters and include uppercase, lowercase, and a number",
    );
  }

  return { email, password };
};

const { email, password } = validateInput();

try {
  await db.sequelize.authenticate();
  const result = await superAdminService.bootstrap({ email, password });
  console.log("Super admin is ready:", result);
} finally {
  await db.sequelize.close();
}
