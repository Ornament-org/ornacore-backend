import { sequelize } from "../../config/database.js";
import { ACTOR_TYPES, SHOPKEEPER_STATUSES, USER_STATUSES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { authRepository } from "./auth.repository.js";
import { hashPassword, verifyPassword } from "./auth.password.service.js";
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
  country: payload.address?.country ?? "India",
  isPrimary: true,
  isActive: true,
});

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
      identifier,
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
