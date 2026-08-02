import Decimal from "decimal.js";
import { Op } from "sequelize";
import { SHOPKEEPER_STATUSES } from "../../constants/app.constants.js";
import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { mediaStorageService } from "../../integrations/media/media-storage.service.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";
import { KHATABOOK_ADJUSTMENT_TYPES } from "../khatabook/khatabook.constants.js";
import { getCurrentMetalDueMap } from "../khatabook/khatabookBalance.js";
import { shopkeeperDetailsService } from "./shopkeeper.service.js";

export const shopkeeperInclude = [
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

export const withBalance = async (profile, { includeManualAdjustments = true } = {}) => {
  const [account, khatabookOrders, activeMetals, manualAdjustments] = await Promise.all([
    db.LedgerAccount.findOne({
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
    }),
    db.KhatabookOrder.findAll({
      where: { shopkeeperId: profile.id },
      include: [{ model: db.Metal, as: "metal", attributes: ["id", "name", "code"], required: false }],
      attributes: ["metalId", "outstandingDue", "cashDueAmount"],
    }).catch(() => []),
    db.Metal.findAll({
      where: { isActive: true },
      order: [["displayOrder", "ASC"], ["id", "ASC"]],
      attributes: ["id", "name", "code"],
    }).catch(() => []),
    includeManualAdjustments
      ? db.KhatabookAdjustment.findAll({
        where: { shopkeeperId: profile.id },
        attributes: ["metalId", "adjustmentType", "dueQuantity", "cashAmount"],
      }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const dueAmount = (account?.journalLines ?? []).reduce(
    (balance, line) =>
      balance + (line.side === "DEBIT" ? Number(line.amount) : -Number(line.amount)),
    0,
  );
  const khatabookCashDue = khatabookOrders.reduce(
    (balance, order) => balance + Number(order.cashDueAmount ?? 0),
    0,
  );
  const manualCashDue = manualAdjustments
    .filter((adjustment) => adjustment.adjustmentType === KHATABOOK_ADJUSTMENT_TYPES.CASH_DUE)
    .reduce((balance, adjustment) => balance + Number(adjustment.cashAmount ?? 0), 0);

  const metalDueMap = await getCurrentMetalDueMap({
    shopkeeperId: profile.id,
    metalIds: activeMetals.map((metal) => metal.id),
    includeManualAdjustments,
  });

  // Emit a row for every active metal (0.000 gm if no orders for that metal)
  const metalDues = activeMetals.map((metal) => {
    const key = String(metal.id);
    const due = metalDueMap.get(key) ?? new Decimal(0);
    return {
      metalId: key,
      name: metal.name,
      code: metal.code,
      dueGrams: due.toFixed(3),
    };
  });

  return { ...profile.toJSON(), dueAmount: (dueAmount + khatabookCashDue + manualCashDue).toFixed(2), metalDues };
};

export const getProfile = async (id, options = {}) => {
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

export const getCurrentShopkeeperProfile = async (userId, options = {}) => {
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

export const normalizeCreditLimits = (creditLimits = []) => {
  const byMetal = new Map();
  for (const limit of creditLimits) {
    byMetal.set(Number(limit.metalId), Number(limit.creditLimitGrams));
  }
  return [...byMetal.entries()]
    .filter(([, creditLimitGrams]) => creditLimitGrams > 0)
    .map(([metalId, creditLimitGrams]) => ({ metalId, creditLimitGrams }));
};

export const replaceMetalCreditLimits = async ({ profileId, creditLimits, transaction }) => {
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

export const upsertPrimaryAddress = async ({ profile, payload, transaction }) => {
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
      state: payload.state ?? "",
      pincode: payload.pincode,
    },
    { transaction },
  );

  return address;
};

const performTransition = async ({ profile, status, reason, allowLogin, action, request, transaction }) => {
  await profile.update(
    {
      status,
      rejectionReason: reason,
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
};

const list = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const getById = async (request, response) => {
  try {
    const profile = await getProfile(request.validated.params.id);
    response.json(ApiResponse.success({ data: await withBalance(profile) }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  PATCH /admin/shopkeepers/:id
  {
    "ownerName": "Ramesh Shah",
    "shopName": "Shah Jewellers",
    "city": "Surat",
    "state": "Gujarat",
    "pincode": "395001",
    "isOrderAllowed": true,
    "creditLimits": [{ "metalId": 1, "creditLimitGrams": 100 }],
    "assignedSalespersonId": 3
  }
*/
const update = async (request, response) => {
  try {
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
          state: request.validated.body.state ?? profile.state ?? "",
          pincode: request.validated.body.pincode ?? profile.pincode,
          country: "India",
          isPrimary: true,
        };
        if (!nextAddress.addressLine1 || !nextAddress.city || !nextAddress.pincode) {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/shopkeepers/:id/approve
  {
    "creditLimits": [{ "metalId": 1, "creditLimitGrams": 100 }, { "metalId": 2, "creditLimitGrams": 50 }],
    "assignedSalespersonId": 3,
    "internalNote": "Verified documents"
  }
*/
const approve = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/shopkeepers/:id/reject
  { "reason": "Incomplete documentation provided" }
*/
const reject = async (request, response) => {
  try {
    const profile = await getProfile(request.validated.params.id);
    await db.sequelize.transaction(async (transaction) => {
      await performTransition({
        profile,
        status: SHOPKEEPER_STATUSES.REJECTED,
        reason: request.validated.body.reason,
        allowLogin: true,
        action: "REJECT",
        request,
        transaction,
      });
    });
    response.json(
      ApiResponse.success({
        message: `Shopkeeper ${SHOPKEEPER_STATUSES.REJECTED.toLowerCase().replaceAll("_", " ")} successfully`,
        data: profile,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/shopkeepers/:id/suspend
  { "reason": "Account under review for irregular activity" }
*/
const suspend = async (request, response) => {
  try {
    const profile = await getProfile(request.validated.params.id);
    await db.sequelize.transaction(async (transaction) => {
      await performTransition({
        profile,
        status: SHOPKEEPER_STATUSES.SUSPENDED,
        reason: request.validated.body.reason,
        allowLogin: true,
        action: "SUSPEND",
        request,
        transaction,
      });
    });
    response.json(
      ApiResponse.success({
        message: `Shopkeeper ${SHOPKEEPER_STATUSES.SUSPENDED.toLowerCase().replaceAll("_", " ")} successfully`,
        data: profile,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/shopkeepers/:id/block
  { "reason": "Fraudulent activity detected" }
*/
const block = async (request, response) => {
  try {
    const profile = await getProfile(request.validated.params.id);
    await db.sequelize.transaction(async (transaction) => {
      await performTransition({
        profile,
        status: SHOPKEEPER_STATUSES.BLOCKED,
        reason: request.validated.body.reason,
        allowLogin: false,
        action: "BLOCK",
        request,
        transaction,
      });
    });
    response.json(
      ApiResponse.success({
        message: `Shopkeeper ${SHOPKEEPER_STATUSES.BLOCKED.toLowerCase().replaceAll("_", " ")} successfully`,
        data: profile,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

/*
  POST /admin/shopkeepers/:id/request-more-info
  { "reason": "Please provide GST certificate and address proof" }
*/
const requestMoreInfo = async (request, response) => {
  try {
    const profile = await getProfile(request.validated.params.id);
    await db.sequelize.transaction(async (transaction) => {
      await performTransition({
        profile,
        status: SHOPKEEPER_STATUSES.DRAFT,
        reason: request.validated.body.reason,
        allowLogin: true,
        action: "REQUEST_MORE_INFO",
        request,
        transaction,
      });
    });
    response.json(
      ApiResponse.success({
        message: `Shopkeeper ${SHOPKEEPER_STATUSES.DRAFT.toLowerCase().replaceAll("_", " ")} successfully`,
        data: profile,
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const getMyProfile = async (request, response) => {
  try {
    const profile = await getCurrentShopkeeperProfile(request.auth.sub);
    response.json(ApiResponse.success({ data: await withBalance(profile) }));
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const updateMyProfile = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const uploadMyProfilePhoto = async (request, response) => {
  try {
    if (!request.file) {
      throw new AppError("Profile photo is required.", {
        statusCode: 422,
        code: "PROFILE_PHOTO_REQUIRED",
        details: { field: "photo" },
      });
    }
    if (!request.file.mimetype.startsWith("image/")) {
      throw new AppError("Profile photo must be an image.", {
        statusCode: 415,
        code: "UNSUPPORTED_PROFILE_PHOTO_TYPE",
        details: { mimeType: request.file.mimetype },
      });
    }

    const profile = await getCurrentShopkeeperProfile(request.auth.sub, { include: [] });
    const result = await mediaStorageService.uploadBuffer(request.file.buffer, {
      folder: `shopkeepers/${profile.id}/profile`,
      resourceType: "image",
      mimeType: request.file.mimetype,
    });

    await db.Media.create({
      publicId: result.publicId,
      secureUrl: result.secureUrl,
      resourceType: result.resourceType,
      folder: result.folder,
      originalFilename: request.file.originalname,
      mimeType: request.file.mimetype,
      sizeBytes: request.file.size,
      width: result.width ?? null,
      height: result.height ?? null,
      uploadedByUserId: request.auth.sub,
      ownerType: "ShopkeeperProfile",
      ownerId: profile.id,
      metadata: {
        provider: result.provider,
        profilePhoto: true,
        ...result.metadata,
      },
    });

    await profile.update({ profileImageUrl: result.secureUrl });

    response.json(
      ApiResponse.success({
        message: "Profile photo updated successfully",
        data: await withBalance(await getCurrentShopkeeperProfile(request.auth.sub)),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const upsertMyAddress = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const submitForApproval = async (request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const shopkeeperController = {
  list,
  getById,
  update,
  approve,
  reject,
  suspend,
  block,
  requestMoreInfo,
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
  upsertMyAddress,
  submitForApproval,
};

const details = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await shopkeeperDetailsService.getDetails(request.validated.params.id),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const analytics = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await shopkeeperDetailsService.getAnalytics(request.validated.params.id),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const ordersSummary = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await shopkeeperDetailsService.getOrdersSummary(request.validated.params.id),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const ledgerSummary = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await shopkeeperDetailsService.getLedgerSummary(request.validated.params.id),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const recentActivity = async (request, response) => {
  try {
    response.json(
      ApiResponse.success({
        data: await shopkeeperDetailsService.getRecentActivity(request.validated.params.id),
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const shopkeeperDetailsController = {
  details,
  analytics,
  ordersSummary,
  ledgerSummary,
  recentActivity,
};
