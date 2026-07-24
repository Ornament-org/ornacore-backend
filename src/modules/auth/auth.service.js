import { sequelize } from "../../config/database.js";
import { env } from "../../config/env.js";
import { ACTOR_TYPES, SHOPKEEPER_STATUSES, USER_STATUSES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { emailOtpProvider } from "../../integrations/otp/email-otp.provider.js";
import { AppError } from "../../shared/errors/AppError.js";
import { authRepository } from "./auth.repository.js";
import { hashPassword, verifyPassword } from "./auth.password.service.js";
import { compareSecretHash, generateNumericOtp, hashSecret } from "./auth.secret.service.js";
import { authSessionService } from "./auth.session.service.js";

const assertActiveUser = (user) => {
  if (!user || user.status !== USER_STATUSES.ACTIVE) {
    throw new AppError("Invalid credentials or inactive account", {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });
  }
};

const assertPassword = async (password, passwordHash) => {
  if (!passwordHash || !(await verifyPassword(password, passwordHash))) {
    throw new AppError("Invalid credentials or inactive account", {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });
  }
};

const assertShopkeeperCanLogin = (profile) => {
  if (!profile) {
    throw new AppError("Shopkeeper profile is missing", {
      statusCode: 409,
      code: "SHOPKEEPER_PROFILE_MISSING",
    });
  }

  if (profile.status === SHOPKEEPER_STATUSES.BLOCKED) {
    throw new AppError("This shopkeeper account is blocked", {
      statusCode: 403,
      code: "SHOPKEEPER_BLOCKED",
    });
  }
};

const normalizeShopkeeperAddress = (payload) => ({
  label: payload.address?.label ?? "Primary",
  contactName: payload.address?.contactName ?? payload.ownerName,
  contactMobile: payload.address?.contactMobile ?? payload.mobile ?? null,
  addressLine1: payload.address?.addressLine1 ?? payload.addressLine1,
  addressLine2: payload.address?.addressLine2 ?? payload.addressLine2 ?? null,
  city: payload.address?.city ?? payload.city,
  state: payload.address?.state ?? payload.state,
  pincode: payload.address?.pincode ?? payload.pincode,
  latitude: payload.address?.latitude ?? payload.latitude ?? null,
  longitude: payload.address?.longitude ?? payload.longitude ?? null,
  country: payload.address?.country ?? "India",
  isPrimary: true,
  isActive: true,
});

const normalizeIdentifier = (identifier) => {
  const value = String(identifier || "").trim();
  if (value.includes("@")) return value.toLowerCase();
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return value.replace(/[\s()-]/g, "");
};

const resetOtpHash = ({ userId, destination, otp }) => hashSecret(`${userId}:${destination}:${otp}`);

const maskEmail = (email) => email.replace(/^(.{2}).*(@.*)$/, "$1***$2");

const findPasswordResetUser = async (identifier, transaction) => {
  const normalized = normalizeIdentifier(identifier);
  return authRepository.findUserForPasswordLogin({
    identifier: normalized,
    actorTypes: authSessionService.allowedShopkeeperActorTypes,
    transaction,
  });
};

const getOtpChallenge = async ({ user, destination, otp, purpose, transaction }) => {
  const challenge = await db.OtpChallenge.findOne({
    where: {
      userId: user.id,
      destination,
      purpose,
      consumedAt: null,
    },
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });

  if (!challenge || challenge.expiresAt <= new Date()) {
    throw new AppError("OTP is invalid or expired", {
      statusCode: 422,
      code: "INVALID_OR_EXPIRED_OTP",
    });
  }

  if (challenge.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new AppError("Too many OTP attempts. Please request a new OTP.", {
      statusCode: 429,
      code: "OTP_ATTEMPTS_EXCEEDED",
    });
  }

  const valid = compareSecretHash(
    `${user.id}:${destination}:${otp}`,
    challenge.codeHash,
  );
  if (!valid) {
    await challenge.increment("attempts", { transaction });
    throw new AppError("OTP is invalid or expired", {
      statusCode: 422,
      code: "INVALID_OR_EXPIRED_OTP",
    });
  }

  return challenge;
};

const getPasswordResetChallenge = (options) =>
  getOtpChallenge({ ...options, purpose: "PASSWORD_RESET" });

const getLoginOtpChallenge = (options) => getOtpChallenge({ ...options, purpose: "LOGIN" });

const createEmailOtpChallenge = async ({ user, destination, purpose, digits, transaction }) => {
  const otp = generateNumericOtp(digits);
  const expiresInMinutes = Math.ceil(env.OTP_TTL_SECONDS / 60);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

  await db.OtpChallenge.update(
    { consumedAt: new Date() },
    {
      where: {
        userId: user.id,
        purpose,
        consumedAt: null,
      },
      transaction,
    },
  );
  await db.OtpChallenge.create(
    {
      userId: user.id,
      purpose,
      channel: "EMAIL",
      destination,
      codeHash: resetOtpHash({ userId: user.id, destination, otp }),
      expiresAt,
    },
    { transaction },
  );

  return { otp, expiresInMinutes };
};

const verifyGoogleIdToken = async (idToken) => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError("Google login is not configured", {
      statusCode: 503,
      code: "GOOGLE_LOGIN_NOT_CONFIGURED",
    });
  }

  const response = await globalThis.fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!response.ok) {
    throw new AppError("Google login token is invalid", {
      statusCode: 401,
      code: "INVALID_GOOGLE_TOKEN",
    });
  }

  const profile = await response.json();
  if (profile.aud !== env.GOOGLE_CLIENT_ID || profile.email_verified !== "true" || !profile.email) {
    throw new AppError("Google account could not be verified", {
      statusCode: 401,
      code: "GOOGLE_ACCOUNT_NOT_VERIFIED",
    });
  }

  return { email: profile.email.toLowerCase() };
};

export const serializeAuthenticatedUser = (user) => ({
  id: String(user.id),
  email: user.email,
  mobile: user.mobile,
  actorType: user.actorType,
  status: user.status,
  mustChangePassword: Boolean(user.mustChangePassword),
  roles: (user.roles ?? []).map((role) => role.code),
  permissions: [
    ...new Set(
      (user.roles ?? []).flatMap((role) =>
        (role.permissions ?? []).map((permission) => permission.code),
      ),
    ),
  ],
  ...(user.shopkeeperProfile
    ? {
        shopkeeper: {
          id: String(user.shopkeeperProfile.id),
          ownerName: user.shopkeeperProfile.ownerName,
          shopName: user.shopkeeperProfile.shopName,
          onboardingStep: user.shopkeeperProfile.onboardingStep,
          status: user.shopkeeperProfile.status,
          isOrderAllowed: user.shopkeeperProfile.isOrderAllowed,
          addresses: (user.shopkeeperProfile.addresses ?? []).map((address) => ({
            id: String(address.id),
            label: address.label,
            contactName: address.contactName,
            contactMobile: address.contactMobile,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country,
            isPrimary: address.isPrimary,
          })),
        },
      }
    : {}),
});

export const authService = {
  async adminLogin({ email, password, client }) {
    const user = await authRepository.findUserForPasswordLogin({
      email,
      actorTypes: authSessionService.allowedAdminActorTypes,
    });

    assertActiveUser(user);
    await assertPassword(password, user.passwordHash);

    const session = await sequelize.transaction(async (transaction) => {
      await authRepository.updateLastLogin(user, { transaction });
      return authSessionService.issueSession({ user, client, transaction });
    });

    return { user: serializeAuthenticatedUser(user), session };
  },

  async shopkeeperLogin({ identifier, password, client }) {
    const user = await authRepository.findUserForPasswordLogin({
      identifier: normalizeIdentifier(identifier),
      actorTypes: authSessionService.allowedShopkeeperActorTypes,
    });

    assertActiveUser(user);
    await assertPassword(password, user.passwordHash);
    assertShopkeeperCanLogin(user.shopkeeperProfile);

    const session = await sequelize.transaction(async (transaction) => {
      await authRepository.updateLastLogin(user, { transaction });
      return authSessionService.issueSession({ user, client, transaction });
    });

    return { user: serializeAuthenticatedUser(user), session };
  },

  async shopkeeperGoogleLogin({ idToken, client }) {
    const { email } = await verifyGoogleIdToken(idToken);
    const user = await authRepository.findUserForPasswordLogin({
      email,
      actorTypes: authSessionService.allowedShopkeeperActorTypes,
    });

    assertActiveUser(user);
    assertShopkeeperCanLogin(user.shopkeeperProfile);

    const session = await sequelize.transaction(async (transaction) => {
      await authRepository.updateLastLogin(user, { transaction });
      return authSessionService.issueSession({ user, client, transaction });
    });

    return { user: serializeAuthenticatedUser(user), session };
  },

  async requestShopkeeperLoginOtp({ identifier }) {
    const user = await findPasswordResetUser(identifier);
    assertActiveUser(user);
    assertShopkeeperCanLogin(user.shopkeeperProfile);

    const destination = user.email?.toLowerCase();
    if (!destination) {
      throw new AppError("OTP login requires a registered email address", {
        statusCode: 422,
        code: "OTP_LOGIN_EMAIL_REQUIRED",
      });
    }

    const { otp, expiresInMinutes } = await sequelize.transaction((transaction) =>
      createEmailOtpChallenge({
        user,
        destination,
        purpose: "LOGIN",
        digits: 4,
        transaction,
      }),
    );

    await emailOtpProvider.send({ destination, otp, expiresInMinutes });

    return {
      destination: maskEmail(destination),
      expiresInSeconds: env.OTP_TTL_SECONDS,
    };
  },

  async verifyShopkeeperLoginOtp({ identifier, otp, client }) {
    const user = await findPasswordResetUser(identifier);
    assertActiveUser(user);
    assertShopkeeperCanLogin(user.shopkeeperProfile);

    const destination = user.email?.toLowerCase();
    if (!destination) {
      throw new AppError("OTP login requires a registered email address", {
        statusCode: 422,
        code: "OTP_LOGIN_EMAIL_REQUIRED",
      });
    }

    const session = await sequelize.transaction(async (transaction) => {
      const challenge = await getLoginOtpChallenge({ user, destination, otp, transaction });
      await challenge.update({ consumedAt: new Date() }, { transaction });
      await authRepository.updateLastLogin(user, { transaction });
      return authSessionService.issueSession({ user, client, transaction });
    });

    return { user: serializeAuthenticatedUser(user), session };
  },

  async requestShopkeeperPasswordReset({ identifier }) {
    const user = await findPasswordResetUser(identifier);
    assertActiveUser(user);
    assertShopkeeperCanLogin(user.shopkeeperProfile);

    const destination = user.email?.toLowerCase();
    if (!destination) {
      throw new AppError("Password reset requires a registered email address", {
        statusCode: 422,
        code: "PASSWORD_RESET_EMAIL_REQUIRED",
      });
    }

    const { otp, expiresInMinutes } = await sequelize.transaction((transaction) =>
      createEmailOtpChallenge({
        user,
        destination,
        purpose: "PASSWORD_RESET",
        digits: 6,
        transaction,
      }),
    );

    await emailOtpProvider.send({ destination, otp, expiresInMinutes });

    return {
      destination: maskEmail(destination),
      expiresInSeconds: env.OTP_TTL_SECONDS,
    };
  },

  async verifyShopkeeperPasswordResetOtp({ identifier, otp }) {
    const user = await findPasswordResetUser(identifier);
    assertActiveUser(user);
    assertShopkeeperCanLogin(user.shopkeeperProfile);
    const destination = user.email?.toLowerCase();
    if (!destination) {
      throw new AppError("Password reset requires a registered email address", {
        statusCode: 422,
        code: "PASSWORD_RESET_EMAIL_REQUIRED",
      });
    }

    await sequelize.transaction(async (transaction) => {
      await getPasswordResetChallenge({ user, destination, otp, transaction });
    });

    return { verified: true };
  },

  async confirmShopkeeperPasswordReset({ identifier, otp, newPassword }) {
    const user = await findPasswordResetUser(identifier);
    assertActiveUser(user);
    assertShopkeeperCanLogin(user.shopkeeperProfile);
    const destination = user.email?.toLowerCase();
    if (!destination) {
      throw new AppError("Password reset requires a registered email address", {
        statusCode: 422,
        code: "PASSWORD_RESET_EMAIL_REQUIRED",
      });
    }

    await sequelize.transaction(async (transaction) => {
      const challenge = await getPasswordResetChallenge({ user, destination, otp, transaction });
      await user.update(
        {
          passwordHash: await hashPassword(newPassword),
          mustChangePassword: false,
        },
        { transaction },
      );
      await challenge.update({ consumedAt: new Date() }, { transaction });
      await db.RefreshToken.update(
        { revokedAt: new Date() },
        { where: { userId: user.id, revokedAt: null }, transaction },
      );
    });

    return { reset: true };
  },

  async registerShopkeeper(payload, client) {
    const normalized = {
      ...payload,
      email: payload.email?.toLowerCase(),
      mobile: payload.mobile?.replace(/[\s()-]/g, ""),
      gstNumber: payload.gstNumber || null,
    };

    return sequelize.transaction(async (transaction) => {
      const existing = await authRepository.findExistingContact({
        email: normalized.email,
        mobile: normalized.mobile,
        transaction,
      });

      if (existing) {
        throw new AppError("An account already exists with this email or mobile", {
          statusCode: 409,
          code: "ACCOUNT_ALREADY_EXISTS",
        });
      }

      const user = await authRepository.createUser(
        {
          email: normalized.email ?? null,
          mobile: normalized.mobile ?? null,
          passwordHash: await hashPassword(normalized.password),
          actorType: ACTOR_TYPES.SHOPKEEPER,
          status: USER_STATUSES.ACTIVE,
        },
        { transaction },
      );

      const profile = await authRepository.createShopkeeperProfile(
        {
          userId: user.id,
          ownerName: normalized.ownerName,
          shopName: normalized.shopName,
          addressLine1: normalized.address?.addressLine1 ?? normalized.addressLine1,
          addressLine2: normalized.address?.addressLine2 ?? normalized.addressLine2 ?? null,
          city: normalized.address?.city ?? normalized.city,
          state: normalized.address?.state ?? normalized.state,
          pincode: normalized.address?.pincode ?? normalized.pincode,
          gstNumber: normalized.gstNumber,
          businessType: normalized.businessType ?? null,
          onboardingStep: "SUBMITTED",
          status: SHOPKEEPER_STATUSES.PENDING_REVIEW,
          isOrderAllowed: false,
        },
        { transaction },
      );

      const address = await db.ShopkeeperAddress.create(
        {
          shopkeeperId: profile.id,
          ...normalizeShopkeeperAddress(normalized),
        },
        { transaction },
      );

      user.shopkeeperProfile = profile;
      user.shopkeeperProfile.addresses = [address];
      user.roles = [];
      const session = await authSessionService.issueSession({
        user,
        client,
        transaction,
      });

      return { user: serializeAuthenticatedUser(user), session };
    });
  },

  async refresh({ refreshToken, actorScope, client }) {
    const allowedActorTypes =
      actorScope === "admin"
        ? authSessionService.allowedAdminActorTypes
        : authSessionService.allowedShopkeeperActorTypes;
    const { user, session } = await authSessionService.refresh({
      refreshToken,
      allowedActorTypes,
      client,
    });

    if (user.actorType === ACTOR_TYPES.SHOPKEEPER) {
      assertActiveUser(user);
      assertShopkeeperCanLogin(user.shopkeeperProfile);
    } else {
      assertActiveUser(user);
    }

    return { user: serializeAuthenticatedUser(user), session };
  },

  logout(refreshToken) {
    return authSessionService.logout(refreshToken);
  },

  logoutAll(userId) {
    return authSessionService.logoutAll(userId);
  },

  async getCurrentUser(userId) {
    const user = await authRepository.findUserWithAccess(userId);
    assertActiveUser(user);
    if (user.actorType === ACTOR_TYPES.SHOPKEEPER) {
      assertShopkeeperCanLogin(user.shopkeeperProfile);
    }
    return serializeAuthenticatedUser(user);
  },

  async changePassword({ userId, currentPassword, newPassword }) {
    const user = await db.User.scope("withPassword").findByPk(userId);
    assertActiveUser(user);
    await assertPassword(currentPassword, user.passwordHash);

    if (await verifyPassword(newPassword, user.passwordHash)) {
      throw new AppError("New password must be different from the current password", {
        statusCode: 422,
        code: "PASSWORD_REUSE_NOT_ALLOWED",
      });
    }

    await sequelize.transaction(async (transaction) => {
      await user.update(
        {
          passwordHash: await hashPassword(newPassword),
          mustChangePassword: false,
        },
        { transaction },
      );
      await db.RefreshToken.update(
        { revokedAt: new Date() },
        { where: { userId: user.id, revokedAt: null }, transaction },
      );
    });
  },
};
