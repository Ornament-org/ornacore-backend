import { Op } from "sequelize";
import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { ADMIN_ASSIGNABLE_ROLE_CODES, SYSTEM_ROLE_CODES } from "../../constants/rbac.constants.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { staffEmailService } from "../../emails/staff-email.service.js";
import { hashPassword } from "../auth/auth.password.service.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import {
  generateEmployeeCodeCandidate,
  generateTemporaryStaffPassword,
} from "./staff.credentials.js";

const generateUniqueEmployeeCode = async (fullName, transaction) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const employeeCode = generateEmployeeCodeCandidate(fullName);
    const exists = await db.StaffProfile.count({
      where: { employeeCode },
      transaction,
    });
    if (!exists) return employeeCode;
  }
  throw new AppError("Unable to generate a unique employee code", {
    statusCode: 503,
    code: "EMPLOYEE_CODE_GENERATION_FAILED",
  });
};

const findRoleByCode = async (code, transaction) => {
  const role = await db.Role.findOne({
    where: { code, isActive: true },
    transaction,
  });
  if (!role) {
    throw new AppError(`${code} role is unavailable`, {
      statusCode: 422,
      code: "ROLE_NOT_AVAILABLE",
    });
  }
  return role;
};

const resolveAssignableRole = async ({ payload, request, transaction }) => {
  if (payload.actorType === ACTOR_TYPES.STAFF) {
    return findRoleByCode(SYSTEM_ROLE_CODES.STAFF, transaction);
  }

  if (!request.auth?.roles?.includes(SYSTEM_ROLE_CODES.SUPER_ADMIN)) {
    throw new AppError("Only Super Admin can create or update admin accounts", {
      statusCode: 403,
      code: "SUPER_ADMIN_REQUIRED",
    });
  }

  if (!payload.roleId) {
    throw new AppError("Admin role is required", {
      statusCode: 422,
      code: "ROLE_REQUIRED",
    });
  }

  const role = await db.Role.findOne({
    where: {
      id: payload.roleId,
      code: { [Op.in]: ADMIN_ASSIGNABLE_ROLE_CODES },
      isActive: true,
    },
    transaction,
  });

  if (!role) {
    throw new AppError("Admin accounts can only be assigned ADMIN or MANAGER", {
      statusCode: 422,
      code: "ROLE_NOT_ASSIGNABLE",
    });
  }

  return role;
};

export const staffService = {
  async list({ page, pageSize, search }) {
    const where = {
      actorType: { [Op.in]: [ACTOR_TYPES.ADMIN, ACTOR_TYPES.STAFF] },
      deletedAt: null,
    };
    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await db.User.findAndCountAll({
      where,
      include: [
        { model: db.StaffProfile, as: "staffProfile", required: false },
        {
          model: db.Role,
          as: "roles",
          through: { attributes: [] },
          required: false,
        },
      ],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    return {
      rows,
      meta: {
        page,
        pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  },

  async create({ payload, request }) {
    const temporaryPassword = generateTemporaryStaffPassword(payload.fullName);
    const created = await db.sequelize.transaction(async (transaction) => {
      const existing = await db.User.findOne({
        where: { email: payload.email },
        transaction,
      });
      if (existing) {
        if (existing.deletedAt) {
          const role = await resolveAssignableRole({ payload, request, transaction });
          await existing.update(
            {
              mobile: payload.mobile ?? existing.mobile,
              passwordHash: await hashPassword(temporaryPassword),
              mustChangePassword: true,
              actorType: payload.actorType,
              status: "ACTIVE",
              emailVerifiedAt: new Date(),
              deletedAt: null,
            },
            { transaction },
          );
          await existing.staffProfile.update(
            {
              fullName: payload.fullName,
              designation: payload.designation ?? null,
              joinedAt: payload.joinedAt ?? null,
            },
            { transaction },
          );
          await db.UserRole.destroy({ where: { userId: existing.id }, transaction });
          await db.UserRole.create(
            {
              userId: existing.id,
              roleId: role.id,
              assignedByUserId: request.auth.sub,
            },
            { transaction },
          );
          await auditLogService.record({
            request,
            action: "RESTORE",
            module: "staff",
            entityType: "User",
            entityId: existing.id,
            newValue: {
              id: existing.id,
              email: existing.email,
              actorType: existing.actorType,
              employeeCode: existing.staffProfile.employeeCode,
              role: role.code,
            },
            transaction,
          });
          return { user: existing, profile: existing.staffProfile, role, isRestored: true };
        }
        throw new AppError("Email is already registered", {
          statusCode: 409,
          code: "ACCOUNT_ALREADY_EXISTS",
        });
      }
      const role = await resolveAssignableRole({ payload, request, transaction });
      const employeeCode = await generateUniqueEmployeeCode(payload.fullName, transaction);
      const user = await db.User.create(
        {
          email: payload.email,
          mobile: payload.mobile ?? null,
          passwordHash: await hashPassword(temporaryPassword),
          mustChangePassword: true,
          actorType: payload.actorType,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
        { transaction },
      );
      const profile = await db.StaffProfile.create(
        {
          userId: user.id,
          employeeCode,
          fullName: payload.fullName,
          designation: payload.designation ?? null,
          joinedAt: payload.joinedAt ?? null,
        },
        { transaction },
      );
      await db.UserRole.create(
        {
          userId: user.id,
          roleId: role.id,
          assignedByUserId: request.auth.sub,
        },
        { transaction },
      );
      await auditLogService.record({
        request,
        action: "CREATE",
        module: "staff",
        entityType: "User",
        entityId: user.id,
        newValue: {
          id: user.id,
          email: user.email,
          actorType: user.actorType,
          employeeCode,
          role: role.code,
        },
        transaction,
      });
      return { user, profile, role, isRestored: false };
    });

    const emailDelivery = await staffEmailService.sendWelcome({
      user: created.user,
      fullName: created.profile.fullName,
      employeeCode: created.profile.employeeCode,
      roleName: created.role.name,
      temporaryPassword,
      isResend: created.isRestored,
    });

    return { ...created, emailDelivery };
  },

  async update({ userId, payload, request }) {
    const user = await db.User.findByPk(userId, {
      include: [{ model: db.StaffProfile, as: "staffProfile", required: true }],
    });
    if (!user) {
      throw new AppError("Staff user not found", {
        statusCode: 404,
        code: "STAFF_NOT_FOUND",
      });
    }

    await db.sequelize.transaction(async (transaction) => {
      const normalizedPayload = {
        actorType: payload.actorType ?? user.actorType,
        roleId: payload.roleId,
      };
      const role =
        payload.actorType || payload.roleId
          ? await resolveAssignableRole({
              payload: normalizedPayload,
              request,
              transaction,
            })
          : null;

      await user.update(
        {
          ...(payload.email ? { email: payload.email } : {}),
          ...(payload.mobile !== undefined ? { mobile: payload.mobile } : {}),
          ...(payload.actorType ? { actorType: payload.actorType } : {}),
          ...(payload.status ? { status: payload.status } : {}),
        },
        { transaction },
      );
      await user.staffProfile.update(
        {
          ...(payload.fullName ? { fullName: payload.fullName } : {}),
          ...(payload.designation !== undefined ? { designation: payload.designation } : {}),
          ...(payload.joinedAt !== undefined ? { joinedAt: payload.joinedAt } : {}),
        },
        { transaction },
      );

      if (role) {
        await db.UserRole.destroy({ where: { userId: user.id }, transaction });
        await db.UserRole.create(
          {
            userId: user.id,
            roleId: role.id,
            assignedByUserId: request.auth.sub,
          },
          { transaction },
        );
      }

      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "staff",
        entityType: "User",
        entityId: user.id,
        newValue: {
          email: user.email,
          fullName: user.staffProfile.fullName,
          roleId: payload.roleId,
        },
        transaction,
      });
    });

    return db.User.findByPk(user.id, {
      include: [
        { model: db.StaffProfile, as: "staffProfile", required: true },
        { model: db.Role, as: "roles", through: { attributes: [] }, required: false },
      ],
    });
  },

  async regenerateCredentials({ userId, request }) {
    const user = await db.User.findByPk(userId, {
      include: [
        { model: db.StaffProfile, as: "staffProfile", required: true },
        {
          model: db.Role,
          as: "roles",
          through: { attributes: [] },
          required: true,
        },
      ],
    });
    if (!user) {
      throw new AppError("Staff user not found", {
        statusCode: 404,
        code: "STAFF_NOT_FOUND",
      });
    }
    const temporaryPassword = generateTemporaryStaffPassword(user.staffProfile.fullName);
    await db.sequelize.transaction(async (transaction) => {
      await user.update(
        {
          passwordHash: await hashPassword(temporaryPassword),
          mustChangePassword: true,
        },
        { transaction },
      );
      await db.RefreshToken.update(
        { revokedAt: new Date() },
        { where: { userId: user.id, revokedAt: null }, transaction },
      );
      await auditLogService.record({
        request,
        action: "REGENERATE_CREDENTIALS",
        module: "staff",
        entityType: "User",
        entityId: user.id,
        newValue: { employeeCode: user.staffProfile.employeeCode },
        transaction,
      });
    });
    return staffEmailService.sendWelcome({
      user,
      fullName: user.staffProfile.fullName,
      employeeCode: user.staffProfile.employeeCode,
      roleName: user.roles[0]?.name ?? "Staff",
      temporaryPassword,
      isResend: true,
    });
  },

  async remove({ userId, actorUserId }) {
    if (String(actorUserId) === String(userId)) {
      throw new AppError("You cannot delete your own account", {
        statusCode: 409,
        code: "SELF_DELETION_FORBIDDEN",
      });
    }

    const user = await db.User.findByPk(userId, {
      include: [{ model: db.StaffProfile, as: "staffProfile", required: true }],
    });
    if (!user) {
      throw new AppError("Staff user not found", {
        statusCode: 404,
        code: "STAFF_NOT_FOUND",
      });
    }
    await user.update({ deletedAt: new Date() });
  },

  async restore(userId) {
    const user = await db.User.findOne({
      where: { id: userId, deletedAt: { [Op.ne]: null } },
      include: [{ model: db.StaffProfile, as: "staffProfile", required: true }],
    });
    if (!user) {
      throw new AppError("Deleted staff user not found", {
        statusCode: 404,
        code: "STAFF_NOT_FOUND",
      });
    }
    await user.update({ deletedAt: null });
  },
};
