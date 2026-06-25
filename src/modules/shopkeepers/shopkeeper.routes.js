import { Op } from "sequelize";
import { z } from "zod";
import { ACTOR_TYPES, SHOPKEEPER_STATUSES } from "../../constants/app.constants.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import db from "../../database/models/InitializeModels.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../shared/errors/AppError.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { idParamSchema, listQuerySchema } from "../../shared/http/crud.validation.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { createModuleRouter } from "../module.router.js";
import { shopkeeperDetailsController } from "./shopkeeper.controller.js";

export const shopkeeperAdminRouter = createModuleRouter();
export const shopkeeperProfileRouter = createModuleRouter();

const approvalSchema = z.object({
  body: z.object({
    creditLimits: z
      .array(
        z.object({
          metalId: z.coerce.number().int().positive(),
          creditLimitGrams: z.coerce.number().nonnegative(),
        }),
      )
      .optional()
      .default([]),
    assignedSalespersonId: z.coerce.number().int().positive().nullable().optional(),
    internalNote: z.string().trim().max(1000).nullable().optional(),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

const reasonSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(3).max(1000),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

const addressBody = z.object({
  label: z.string().trim().min(2).max(100).default("Primary"),
  contactName: z.string().trim().min(2).max(191).nullable().optional(),
  contactMobile: z.string().trim().max(32).nullable().optional(),
  addressLine1: z.string().trim().min(3).max(255),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().trim().min(4).max(12),
  country: z.string().trim().min(2).max(80).default("India"),
  isPrimary: z.boolean().optional(),
});

const shopkeeperUpdateBody = z.object({
  ownerName: z.string().trim().min(2).max(191).optional(),
  shopName: z.string().trim().min(2).max(191).optional(),
  addressLine1: z.string().trim().max(255).nullable().optional(),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(120).nullable().optional(),
  pincode: z.string().trim().max(12).nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  gstNumber: z.string().trim().max(32).nullable().optional(),
  businessType: z.string().trim().max(100).nullable().optional(),
  creditLimits: z
    .array(
      z.object({
        metalId: z.coerce.number().int().positive(),
        creditLimitGrams: z.coerce.number().nonnegative(),
      }),
    )
    .optional(),
  assignedSalespersonId: z.coerce.number().int().positive().nullable().optional(),
  isOrderAllowed: z.boolean().optional(),
});

const updateSchema = z.object({
  body: shopkeeperUpdateBody.refine((value) => Object.keys(value).length > 0),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

const shopkeeperInclude = [
  {
    model: db.User,
    as: "user",
    attributes: ["id", "email", "mobile", "status", "createdAt", "lastLoginAt"],
  },
  {
    model: db.ShopkeeperMetalCreditLimit,
    as: "metalCreditLimits",
    required: false,
    include: [{ model: db.Metal, as: "metal", required: false }],
  },
  { model: db.ShopkeeperAddress, as: "addresses", required: false },
  {
    model: db.StaffProfile,
    as: "assignedSalesperson",
    required: false,
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "email", "mobile", "status"],
        required: false,
      },
    ],
  },
];

const withBalance = async (profile) => {
  const account = await db.LedgerAccount.findOne({
    where: { shopkeeperId: profile.id, accountType: "ASSET" },
    include: [
      {
        model: db.JournalLine,
        as: "journalLines",
        required: false,
        include: [
          {
            model: db.JournalEntry,
            as: "journalEntry",
            where: { status: "POSTED" },
            required: true,
          },
        ],
      },
    ],
  });
  const dueAmount = (account?.journalLines ?? []).reduce(
    (balance, line) =>
      balance + (line.side === "DEBIT" ? Number(line.amount) : -Number(line.amount)),
    0,
  );
  return { ...profile.toJSON(), dueAmount: dueAmount.toFixed(2) };
};

const getProfile = async (id, options = {}) => {
  const profile = await db.ShopkeeperProfile.findByPk(id, {
    include: shopkeeperInclude,
    ...options,
  });
  if (!profile) {
    throw new AppError("Shopkeeper not found", {
      statusCode: 404,
      code: "SHOPKEEPER_NOT_FOUND",
    });
  }
  return profile;
};

const getCurrentShopkeeperProfile = async (userId, options = {}) => {
  const profile = await db.ShopkeeperProfile.findOne({
    where: { userId },
    include: shopkeeperInclude,
    ...options,
  });
  if (!profile) {
    throw new AppError("Shopkeeper profile not found", {
      statusCode: 404,
      code: "SHOPKEEPER_PROFILE_MISSING",
    });
  }
  return profile;
};

const normalizeCreditLimits = (creditLimits = []) => {
  const byMetal = new Map();
  for (const limit of creditLimits) {
    byMetal.set(Number(limit.metalId), Number(limit.creditLimitGrams));
  }
  return [...byMetal.entries()]
    .filter(([, creditLimitGrams]) => creditLimitGrams > 0)
    .map(([metalId, creditLimitGrams]) => ({ metalId, creditLimitGrams }));
};

const replaceMetalCreditLimits = async ({ profileId, creditLimits, transaction }) => {
  if (!creditLimits) return;
  const normalized = normalizeCreditLimits(creditLimits);
  const metalIds = normalized.map((limit) => limit.metalId);
  if (metalIds.length) {
    const activeMetals = await db.Metal.count({
      where: { id: { [Op.in]: metalIds }, isActive: true },
      transaction,
    });
    if (activeMetals !== metalIds.length) {
      throw new AppError("One or more selected metals are inactive or unavailable", {
        statusCode: 422,
        code: "INVALID_METAL_CREDIT_LIMIT",
      });
    }
  }
  await db.ShopkeeperMetalCreditLimit.destroy({
    where: { shopkeeperId: profileId },
    transaction,
  });
  if (!normalized.length) return;
  await db.ShopkeeperMetalCreditLimit.bulkCreate(
    normalized.map((limit) => ({
      shopkeeperId: profileId,
      metalId: limit.metalId,
      creditLimitGrams: limit.creditLimitGrams,
    })),
    { transaction },
  );
};

const upsertPrimaryAddress = async ({ profile, payload, transaction }) => {
  const existingPrimary = await db.ShopkeeperAddress.findOne({
    where: { shopkeeperId: profile.id, isPrimary: true },
    transaction,
  });

  if (payload.isPrimary !== false) {
    await db.ShopkeeperAddress.update(
      { isPrimary: false },
      { where: { shopkeeperId: profile.id }, transaction },
    );
  }

  const address =
    existingPrimary ??
    (await db.ShopkeeperAddress.create(
      {
        shopkeeperId: profile.id,
        ...payload,
        isPrimary: payload.isPrimary ?? true,
        isActive: true,
      },
      { transaction },
    ));

  if (existingPrimary) {
    await address.update(
      {
        ...payload,
        isPrimary: payload.isPrimary ?? true,
        isActive: true,
      },
      { transaction },
    );
  }

  await profile.update(
    {
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2 ?? null,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
    },
    { transaction },
  );

  return address;
};

shopkeeperAdminRouter.get(
  "/",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(listQuerySchema),
  asyncHandler(async (request, response) => {
    const { page, pageSize, search, status } = request.validated.query;
    const where = {};
    const userWhere = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { shopName: { [Op.like]: `%${search}%` } },
        { ownerName: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
      ];
      userWhere[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
      ];
    }

    const include = shopkeeperInclude.map((entry) =>
      entry.as === "user" && search ? { ...entry, where: userWhere, required: false } : entry,
    );
    const { rows, count } = await db.ShopkeeperProfile.findAndCountAll({
      where,
      include,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });
    const data = await Promise.all(rows.map(withBalance));
    response.json(
      ApiResponse.success({
        data,
        meta: {
          page,
          pageSize,
          totalItems: count,
          totalPages: Math.ceil(count / pageSize),
        },
      }),
    );
  }),
);

shopkeeperAdminRouter.get(
  "/:id/details",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperDetailsController.details),
);

shopkeeperAdminRouter.get(
  "/:id/analytics",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperDetailsController.analytics),
);

shopkeeperAdminRouter.get(
  "/:id/orders-summary",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperDetailsController.ordersSummary),
);

shopkeeperAdminRouter.get(
  "/:id/ledger-summary",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperDetailsController.ledgerSummary),
);

shopkeeperAdminRouter.get(
  "/:id/recent-activity",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(shopkeeperDetailsController.recentActivity),
);

shopkeeperAdminRouter.get(
  "/:id",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_VIEW),
  validate(idParamSchema),
  asyncHandler(async (request, response) => {
    const profile = await getProfile(request.validated.params.id);
    response.json(ApiResponse.success({ data: await withBalance(profile) }));
  }),
);

shopkeeperAdminRouter.patch(
  "/:id",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_UPDATE),
  validate(updateSchema),
  asyncHandler(async (request, response) => {
    const profile = await getProfile(request.validated.params.id);
    const oldValue = profile.toJSON();
    await db.sequelize.transaction(async (transaction) => {
      const { creditLimits, ...profilePayload } = request.validated.body;
      await profile.update(profilePayload, { transaction });
      await replaceMetalCreditLimits({
        profileId: profile.id,
        creditLimits,
        transaction,
      });
      if (
        request.validated.body.addressLine1 ||
        request.validated.body.city ||
        request.validated.body.state ||
        request.validated.body.pincode
      ) {
        const nextAddress = {
          label: "Primary",
          contactName: profile.ownerName,
          contactMobile: profile.user?.mobile ?? null,
          addressLine1: request.validated.body.addressLine1 ?? profile.addressLine1,
          addressLine2: request.validated.body.addressLine2 ?? profile.addressLine2,
          city: request.validated.body.city ?? profile.city,
          state: request.validated.body.state ?? profile.state,
          pincode: request.validated.body.pincode ?? profile.pincode,
          country: "India",
          isPrimary: true,
        };
        if (!nextAddress.addressLine1 || !nextAddress.city || !nextAddress.state || !nextAddress.pincode) {
          throw new AppError("Complete address is required before saving address changes", {
            statusCode: 422,
            code: "SHOPKEEPER_ADDRESS_INCOMPLETE",
          });
        }
        await upsertPrimaryAddress({
          profile,
          payload: nextAddress,
          transaction,
        });
      }
      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "shopkeepers",
        entityType: "ShopkeeperProfile",
        entityId: profile.id,
        oldValue,
        newValue: profile,
        transaction,
      });
    });
    response.json(
      ApiResponse.success({
        message: "Shopkeeper updated successfully",
        data: profile,
      }),
    );
  }),
);

shopkeeperAdminRouter.post(
  "/:id/approve",
  ...protectAdmin(PERMISSIONS.SHOPKEEPER_APPROVE),
  validate(approvalSchema),
  asyncHandler(async (request, response) => {
    const profile = await getProfile(request.validated.params.id);
    const hasAddress = (profile.addresses ?? []).some((address) => address.isActive);
    if (!profile.ownerName || !profile.shopName || !hasAddress) {
      throw new AppError("Shopkeeper profile and address must be complete before approval", {
        statusCode: 422,
        code: "SHOPKEEPER_ONBOARDING_INCOMPLETE",
      });
    }
    if (
      ![
        SHOPKEEPER_STATUSES.PENDING_REVIEW,
        SHOPKEEPER_STATUSES.REJECTED,
        SHOPKEEPER_STATUSES.SUSPENDED,
        SHOPKEEPER_STATUSES.DRAFT,
      ].includes(profile.status)
    ) {
      throw new AppError("Shopkeeper cannot be approved from the current status", {
        statusCode: 409,
        code: "INVALID_SHOPKEEPER_TRANSITION",
      });
    }
    const payload = request.validated.body;
    await db.sequelize.transaction(async (transaction) => {
      await profile.update(
        {
          status: SHOPKEEPER_STATUSES.APPROVED,
          assignedSalespersonId: payload.assignedSalespersonId ?? null,
          approvedByUserId: request.auth.sub,
          approvedAt: new Date(),
          rejectionReason: null,
          isOrderAllowed: true,
          onboardingStep: "APPROVED",
        },
        { transaction },
      );
      await replaceMetalCreditLimits({
        profileId: profile.id,
        creditLimits: payload.creditLimits,
        transaction,
      });
      await db.LedgerAccount.findOrCreate({
        where: { code: `AR-SHOP-${profile.id}` },
        defaults: {
          name: `${profile.shopName} Receivable`,
          accountType: "ASSET",
          ownerType: "SHOPKEEPER",
          shopkeeperId: profile.id,
          currency: "INR",
          isActive: true,
        },
        transaction,
      });
      await db.Notification.create(
        {
          userId: profile.userId,
          eventType: "SHOPKEEPER_APPROVED",
          channel: "IN_APP",
          title: "Account approved",
          body: "Your OrnaCore shopkeeper account has been approved.",
          status: "SENT",
          sentAt: new Date(),
        },
        { transaction },
      );
      await auditLogService.record({
        request,
        action: "APPROVE",
        module: "shopkeepers",
        entityType: "ShopkeeperProfile",
        entityId: profile.id,
        newValue: profile,
        transaction,
      });
    });
    response.json(
      ApiResponse.success({ message: "Shopkeeper approved successfully", data: profile }),
    );
  }),
);

const transitionWithReason = ({ path, permission, status, action, allowLogin = true }) => {
  shopkeeperAdminRouter.post(
    `/:id/${path}`,
    ...protectAdmin(permission),
    validate(reasonSchema),
    asyncHandler(async (request, response) => {
      const profile = await getProfile(request.validated.params.id);
      await db.sequelize.transaction(async (transaction) => {
        await profile.update(
          {
            status,
            rejectionReason: request.validated.body.reason,
            isOrderAllowed: false,
          },
          { transaction },
        );
        if (!allowLogin) {
          await profile.user.update({ status: "BLOCKED" }, { transaction });
          await db.RefreshToken.update(
            { revokedAt: new Date() },
            { where: { userId: profile.userId, revokedAt: null }, transaction },
          );
        }
        await auditLogService.record({
          request,
          action,
          module: "shopkeepers",
          entityType: "ShopkeeperProfile",
          entityId: profile.id,
          newValue: profile,
          transaction,
        });
      });
      response.json(
        ApiResponse.success({
          message: `Shopkeeper ${status.toLowerCase().replaceAll("_", " ")} successfully`,
          data: profile,
        }),
      );
    }),
  );
};

transitionWithReason({
  path: "reject",
  permission: PERMISSIONS.SHOPKEEPER_REJECT,
  status: SHOPKEEPER_STATUSES.REJECTED,
  action: "REJECT",
});
transitionWithReason({
  path: "suspend",
  permission: PERMISSIONS.SHOPKEEPER_SUSPEND,
  status: SHOPKEEPER_STATUSES.SUSPENDED,
  action: "SUSPEND",
});
transitionWithReason({
  path: "block",
  permission: PERMISSIONS.SHOPKEEPER_BLOCK,
  status: SHOPKEEPER_STATUSES.BLOCKED,
  action: "BLOCK",
  allowLogin: false,
});
transitionWithReason({
  path: "request-more-info",
  permission: PERMISSIONS.SHOPKEEPER_UPDATE,
  status: SHOPKEEPER_STATUSES.DRAFT,
  action: "REQUEST_MORE_INFO",
});

shopkeeperProfileRouter.use(authenticate, requireActorType(ACTOR_TYPES.SHOPKEEPER));

shopkeeperProfileRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const profile = await getCurrentShopkeeperProfile(request.auth.sub);
    response.json(ApiResponse.success({ data: await withBalance(profile) }));
  }),
);

shopkeeperProfileRouter.patch(
  "/",
  validate(
    z.object({
      body: shopkeeperUpdateBody
        .omit({
          creditLimits: true,
          assignedSalespersonId: true,
          isOrderAllowed: true,
        })
        .refine((value) => Object.keys(value).length > 0),
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough(),
    }),
  ),
  asyncHandler(async (request, response) => {
    const profile = await getCurrentShopkeeperProfile(request.auth.sub, { include: [] });
    await profile.update({
      ...request.validated.body,
      onboardingStep:
        profile.status === SHOPKEEPER_STATUSES.DRAFT ? "PROFILE" : profile.onboardingStep,
    });
    response.json(
      ApiResponse.success({
        message: "Shopkeeper profile updated successfully",
        data: profile,
      }),
    );
  }),
);

shopkeeperProfileRouter.put(
  "/address",
  validate(
    z.object({
      body: addressBody,
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough(),
    }),
  ),
  asyncHandler(async (request, response) => {
    const profile = await getCurrentShopkeeperProfile(request.auth.sub, { include: [] });
    const address = await db.sequelize.transaction((transaction) =>
      upsertPrimaryAddress({
        profile,
        payload: request.validated.body,
        transaction,
      }),
    );
    response.json(
      ApiResponse.success({
        message: "Shop address saved successfully",
        data: address,
      }),
    );
  }),
);

shopkeeperProfileRouter.post(
  "/submit-for-approval",
  validate(
    z.object({
      body: z.object({}).passthrough(),
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough(),
    }),
  ),
  asyncHandler(async (request, response) => {
    const profile = await getCurrentShopkeeperProfile(request.auth.sub);

    if ([SHOPKEEPER_STATUSES.APPROVED, SHOPKEEPER_STATUSES.BLOCKED].includes(profile.status)) {
      throw new AppError("Shopkeeper cannot be submitted from the current status", {
        statusCode: 409,
        code: "INVALID_SHOPKEEPER_TRANSITION",
      });
    }

    const hasAddress = (profile.addresses ?? []).some((address) => address.isActive);
    if (!profile.ownerName || !profile.shopName || !hasAddress) {
      throw new AppError("Shop profile and primary address are required before approval", {
        statusCode: 422,
        code: "SHOPKEEPER_ONBOARDING_INCOMPLETE",
      });
    }

    await profile.update({
      status: SHOPKEEPER_STATUSES.PENDING_REVIEW,
      onboardingStep: "SUBMITTED",
      rejectionReason: null,
      isOrderAllowed: false,
    });

    response.json(
      ApiResponse.success({
        message: "Shop profile submitted for admin approval",
        data: await withBalance(await getCurrentShopkeeperProfile(request.auth.sub)),
      }),
    );
  }),
);
