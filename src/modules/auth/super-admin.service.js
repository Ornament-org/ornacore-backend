import db from "../../database/models/InitializeModels.js";
import { ACTOR_TYPES, USER_STATUSES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { AppError } from "../../shared/errors/AppError.js";
import { hashPassword } from "./auth.password.service.js";

const ensurePermissions = async (transaction) => {
  const permissionCodes = Object.values(PERMISSIONS);
  await db.Permission.bulkCreate(
    permissionCodes.map((code) => {
      const [module, ...actionParts] = code.split(".");
      return {
        code,
        module,
        action: actionParts.join("."),
        description: `Allows ${code}`,
      };
    }),
    { transaction, ignoreDuplicates: true },
  );

  return db.Permission.findAll({
    where: { code: permissionCodes },
    transaction,
  });
};

export const superAdminService = {
  async bootstrap({ email, password }) {
    return db.sequelize.transaction(async (transaction) => {
      const [role] = await db.Role.findOrCreate({
        where: { code: "SUPER_ADMIN" },
        defaults: {
          name: "Super Admin",
          description: "Built-in role with every administrative permission",
          isSystem: true,
          isActive: true,
        },
        transaction,
      });

      await role.update(
        {
          name: "Super Admin",
          description: "Built-in role with every administrative permission",
          isSystem: true,
          isActive: true,
        },
        { transaction },
      );

      const permissions = await ensurePermissions(transaction);
      await db.RolePermission.bulkCreate(
        permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
        { transaction, ignoreDuplicates: true },
      );

      let user = await db.User.scope("withPassword").findOne({
        where: { email },
        transaction,
      });
      const created = !user;

      if (user && user.actorType !== ACTOR_TYPES.ADMIN) {
        throw new AppError("This email already belongs to a non-admin account", {
          statusCode: 409,
          code: "EMAIL_BELONGS_TO_NON_ADMIN",
        });
      }

      const userValues = {
        email,
        passwordHash: await hashPassword(password),
        actorType: ACTOR_TYPES.ADMIN,
        status: USER_STATUSES.ACTIVE,
        mustChangePassword: false,
        emailVerifiedAt: user?.emailVerifiedAt ?? new Date(),
      };

      if (user) {
        await user.update(userValues, { transaction });
        await db.RefreshToken.update(
          { revokedAt: new Date() },
          { where: { userId: user.id, revokedAt: null }, transaction },
        );
      } else {
        user = await db.User.create(userValues, { transaction });
      }

      await db.UserRole.findOrCreate({
        where: { userId: user.id, roleId: role.id },
        defaults: { assignedByUserId: user.id },
        transaction,
      });

      return {
        created,
        user: {
          id: String(user.id),
          email: user.email,
          actorType: user.actorType,
          status: user.status,
        },
        role: role.code,
        permissionCount: permissions.length,
      };
    });
  },
};
