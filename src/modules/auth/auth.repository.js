import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";

const accessInclude = [
  {
    model: db.Role,
    as: "roles",
    required: false,
    through: { attributes: [] },
    where: { isActive: true },
    include: [
      {
        model: db.Permission,
        as: "permissions",
        required: false,
        through: { attributes: [] },
      },
    ],
  },
  {
    model: db.ShopkeeperProfile,
    as: "shopkeeperProfile",
    required: false,
    include: [{ model: db.ShopkeeperAddress, as: "addresses", required: false }],
  },
];

export const authRepository = {
  findUserForPasswordLogin({ email, identifier, actorTypes, transaction }) {
    const contactWhere = email
      ? { email }
      : {
          [Op.or]: [
            { email: identifier.trim().toLowerCase() },
            { mobile: identifier.replace(/[\s()-]/g, "") },
          ],
        };

    return db.User.scope("withPassword").findOne({
      where: {
        ...contactWhere,
        actorType: { [Op.in]: actorTypes },
        deletedAt: null,
      },
      include: accessInclude,
      transaction,
    });
  },

  findUserWithAccess(userId, { transaction } = {}) {
    return db.User.findOne({
      where: { id: userId, deletedAt: null },
      include: accessInclude,
      transaction,
    });
  },

  findExistingContact({ email, mobile, transaction }) {
    const contacts = [];
    if (email) contacts.push({ email });
    if (mobile) contacts.push({ mobile });
    if (!contacts.length) return null;

    return db.User.findOne({
      where: { [Op.or]: contacts, deletedAt: null },
      transaction,
    });
  },

  createUser(payload, { transaction }) {
    return db.User.create(payload, { transaction });
  },

  createShopkeeperProfile(payload, { transaction }) {
    return db.ShopkeeperProfile.create(payload, { transaction });
  },

  updateLastLogin(user, { transaction }) {
    return user.update({ lastLoginAt: new Date() }, { transaction });
  },

  createRefreshToken(payload, { transaction }) {
    return db.RefreshToken.create(payload, { transaction });
  },

  findRefreshTokenForUpdate(tokenHash, { transaction }) {
    return db.RefreshToken.findOne({
      where: { tokenHash },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  },

  revokeRefreshToken(record, replacementTokenId, { transaction }) {
    return record.update(
      {
        revokedAt: record.revokedAt ?? new Date(),
        replacedByTokenId: replacementTokenId ?? record.replacedByTokenId,
      },
      { transaction },
    );
  },

  revokeTokenFamily(tokenFamily, { transaction } = {}) {
    return db.RefreshToken.update(
      { revokedAt: new Date() },
      {
        where: {
          tokenFamily,
          revokedAt: null,
        },
        transaction,
      },
    );
  },

  revokeAllUserTokens(userId) {
    return db.RefreshToken.update(
      { revokedAt: new Date() },
      {
        where: {
          userId,
          revokedAt: null,
        },
      },
    );
  },
};
