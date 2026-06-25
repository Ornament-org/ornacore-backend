import { randomInt, randomUUID } from "node:crypto";
import db from "../src/database/models/InitializeModels.js";
import { env } from "../src/config/env.js";
import { ACTOR_TYPES, USER_STATUSES } from "../src/constants/app.constants.js";
import { hashPassword } from "../src/modules/auth/auth.password.service.js";

const suffix = randomUUID().slice(0, 8);
const adminCredentials = {
  email: `admin-smoke-${suffix}@example.com`,
  password: "SmokeAdmin123",
};
const shopkeeperCredentials = {
  email: `shop-smoke-${suffix}@example.com`,
  mobile: `+919${randomInt(100000000, 999999999)}`,
  password: "SmokeShop123",
};
const baseUrl = `${env.APP_BASE_URL}${env.API_PREFIX}`;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const request = async (path, { method = "GET", body, accessToken } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  return { status: response.status, payload };
};

const cleanup = async () => {
  await db.User.destroy({
    where: {
      email: [adminCredentials.email, shopkeeperCredentials.email],
    },
  });
};

try {
  await db.sequelize.authenticate();
  await cleanup();

  await db.User.create({
    email: adminCredentials.email,
    passwordHash: await hashPassword(adminCredentials.password),
    actorType: ACTOR_TYPES.ADMIN,
    status: USER_STATUSES.ACTIVE,
    emailVerifiedAt: new Date(),
  });

  const adminLogin = await request("/admin/auth/login", {
    method: "POST",
    body: adminCredentials,
  });
  assert(adminLogin.status === 200, "Admin login failed");
  assert(adminLogin.payload.data.user.actorType === ACTOR_TYPES.ADMIN, "Admin actor mismatch");

  const adminMe = await request("/admin/auth/me", {
    accessToken: adminLogin.payload.data.accessToken,
  });
  assert(adminMe.status === 200, "Admin current-user route failed");

  const adminRefresh = await request("/admin/auth/refresh", {
    method: "POST",
    body: { refreshToken: adminLogin.payload.data.refreshToken },
  });
  assert(adminRefresh.status === 200, "Admin refresh failed");

  const adminLogout = await request("/admin/auth/logout", {
    method: "POST",
    body: { refreshToken: adminRefresh.payload.data.refreshToken },
  });
  assert(adminLogout.status === 200, "Admin logout failed");

  const registration = await request("/shopkeeper/auth/register", {
    method: "POST",
    body: {
      ownerName: "Smoke Test Owner",
      shopName: "Smoke Test Jewellers",
      email: shopkeeperCredentials.email,
      mobile: shopkeeperCredentials.mobile,
      password: shopkeeperCredentials.password,
      addressLine1: "1 Test Market",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      businessType: "RETAILER",
    },
  });
  assert(registration.status === 201, "Shopkeeper registration failed");
  assert(
    registration.payload.data.user.shopkeeper.status === "PENDING_REVIEW",
    "Shopkeeper was not placed in pending review",
  );

  const shopkeeperMe = await request("/shopkeeper/auth/me", {
    accessToken: registration.payload.data.accessToken,
  });
  assert(shopkeeperMe.status === 200, "Shopkeeper current-user route failed");

  const shopkeeperLogin = await request("/shopkeeper/auth/login", {
    method: "POST",
    body: {
      identifier: shopkeeperCredentials.mobile,
      password: shopkeeperCredentials.password,
    },
  });
  assert(shopkeeperLogin.status === 200, "Shopkeeper mobile/password login failed");

  const shopkeeperRefresh = await request("/shopkeeper/auth/refresh", {
    method: "POST",
    body: { refreshToken: shopkeeperLogin.payload.data.refreshToken },
  });
  assert(shopkeeperRefresh.status === 200, "Shopkeeper refresh failed");

  const shopkeeperLogout = await request("/shopkeeper/auth/logout", {
    method: "POST",
    body: { refreshToken: shopkeeperRefresh.payload.data.refreshToken },
  });
  assert(shopkeeperLogout.status === 200, "Shopkeeper logout failed");

  console.log("Authentication smoke test passed", {
    admin: ["login", "me", "refresh", "logout"],
    shopkeeper: ["register", "me", "mobile-password login", "refresh", "logout"],
  });
} finally {
  await cleanup();
  await db.sequelize.close();
}
