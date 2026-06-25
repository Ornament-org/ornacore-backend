import { v4 as uuidv4 } from "uuid";
import { sequelize } from "../../config/database.js";
import { ACTOR_TYPES, SHOPKEEPER_STATUSES, USER_STATUSES } from "../../constants/app.constants.js";
import { AppError } from "../../shared/errors/AppError.js";
import { hashSecret } from "./auth.secret.service.js";
import { authRepository } from "./auth.repository.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./auth.token.service.js";

const getAuthorizationContext = (user) => {
  const roles = (user.roles ?? []).map((role) => role.code);
  const permissions = [
    ...new Set(
      (user.roles ?? []).flatMap((role) =>
        (role.permissions ?? []).map((permission) => permission.code),
      ),
    ),
  ];

  return { roles, permissions };
};

const createStoredRefreshToken = async ({ user, tokenFamily, client, transaction }) => {
  const tokenId = uuidv4();
  const refreshToken = signRefreshToken({
    sub: String(user.id),
    type: "refresh",
    familyId: tokenFamily,
    tokenId,
  });
  const decoded = verifyRefreshToken(refreshToken);

  const record = await authRepository.createRefreshToken(
    {
      userId: user.id,
      tokenHash: hashSecret(refreshToken),
      tokenFamily,
      expiresAt: new Date(decoded.exp * 1000),
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    },
    { transaction },
  );

  return { refreshToken, record };
};

const issueSession = async ({ user, client, transaction, tokenFamily = uuidv4() }) => {
  const { roles, permissions } = getAuthorizationContext(user);
  const accessToken = signAccessToken({
    sub: String(user.id),
    type: "access",
    actorType: user.actorType,
    roles,
    permissions,
    shopkeeperStatus: user.shopkeeperProfile?.status,
    mustChangePassword: Boolean(user.mustChangePassword),
  });
  const { refreshToken, record } = await createStoredRefreshToken({
    user,
    tokenFamily,
    client,
    transaction,
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenId: record.id,
    tokenType: "Bearer",
  };
};

const assertRefreshPayload = (payload) => {
  if (payload.type !== "refresh" || !payload.sub || !payload.familyId || !payload.tokenId) {
    throw new AppError("Refresh token payload is invalid", {
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
    });
  }
};

const verifyRefresh = (refreshToken) => {
  try {
    const payload = verifyRefreshToken(refreshToken);
    assertRefreshPayload(payload);
    return payload;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Refresh token is invalid or expired", {
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
      cause: error,
    });
  }
};

export const authSessionService = {
  issueSession,

  async refresh({ refreshToken, allowedActorTypes, client }) {
    const payload = verifyRefresh(refreshToken);
    const tokenHash = hashSecret(refreshToken);

    const outcome = await sequelize.transaction(async (transaction) => {
      const currentToken = await authRepository.findRefreshTokenForUpdate(tokenHash, {
        transaction,
      });

      if (!currentToken) return { status: "MISSING" };

      if (currentToken.revokedAt) {
        await authRepository.revokeTokenFamily(currentToken.tokenFamily, { transaction });
        return { status: "REUSED" };
      }

      if (currentToken.expiresAt <= new Date()) {
        await authRepository.revokeRefreshToken(currentToken, null, { transaction });
        return { status: "EXPIRED" };
      }

      const user = await authRepository.findUserWithAccess(currentToken.userId, {
        transaction,
      });

      if (!user || !allowedActorTypes.includes(user.actorType)) {
        await authRepository.revokeRefreshToken(currentToken, null, { transaction });
        return { status: "ACTOR_FORBIDDEN" };
      }

      if (
        user.status !== USER_STATUSES.ACTIVE ||
        user.shopkeeperProfile?.status === SHOPKEEPER_STATUSES.BLOCKED
      ) {
        await authRepository.revokeTokenFamily(currentToken.tokenFamily, { transaction });
        return { status: "ACCOUNT_INACTIVE" };
      }

      if (currentToken.tokenFamily !== payload.familyId) {
        await authRepository.revokeTokenFamily(currentToken.tokenFamily, { transaction });
        return { status: "REUSED" };
      }

      const session = await issueSession({
        user,
        client,
        transaction,
        tokenFamily: currentToken.tokenFamily,
      });
      await authRepository.revokeRefreshToken(currentToken, session.refreshTokenId, {
        transaction,
      });

      return { status: "ROTATED", session, user };
    });

    if (outcome.status === "REUSED") {
      throw new AppError("Refresh token reuse was detected; the session was revoked", {
        statusCode: 401,
        code: "REFRESH_TOKEN_REUSE_DETECTED",
      });
    }

    if (outcome.status !== "ROTATED") {
      throw new AppError(
        outcome.status === "ACCOUNT_INACTIVE"
          ? "Account is inactive or blocked"
          : "Refresh token is no longer active",
        {
          statusCode: 401,
          code:
            outcome.status === "ACCOUNT_INACTIVE" ? "ACCOUNT_INACTIVE" : "INACTIVE_REFRESH_TOKEN",
        },
      );
    }

    return outcome;
  },

  async logout(refreshToken) {
    const payload = verifyRefresh(refreshToken);
    const tokenHash = hashSecret(refreshToken);

    await sequelize.transaction(async (transaction) => {
      const record = await authRepository.findRefreshTokenForUpdate(tokenHash, {
        transaction,
      });
      if (record && !record.revokedAt) {
        await authRepository.revokeRefreshToken(record, null, { transaction });
      }
    });

    return { tokenFamily: payload.familyId };
  },

  async logoutAll(userId) {
    await authRepository.revokeAllUserTokens(userId);
  },

  allowedAdminActorTypes: [ACTOR_TYPES.ADMIN, ACTOR_TYPES.STAFF],
  allowedShopkeeperActorTypes: [ACTOR_TYPES.SHOPKEEPER],
};
