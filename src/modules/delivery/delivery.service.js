import db from "../../database/models/InitializeModels.js";
import { AppError } from "../../shared/errors/AppError.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";

const deliveryFields = [
  "orderId",
  "status",
  "courierName",
  "trackingNumber",
  "trackingUrl",
  "dispatchedAt",
  "estimatedDeliveryAt",
  "deliveredAt",
  "proofMediaId",
  "notes",
];

const deliveryInclude = [
  {
    model: db.Order,
    as: "order",
    include: [{ model: db.ShopkeeperProfile, as: "shopkeeper" }],
  },
];

const filterDeliveryPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload ?? {}).filter(
      ([key, value]) => deliveryFields.includes(key) && value !== undefined,
    ),
  );

const getDeliveryOrThrow = async (id, options = {}) => {
  const delivery = await db.Delivery.findByPk(id, options);
  if (!delivery) {
    throw new AppError("Delivery not found", {
      statusCode: 404,
      code: "RESOURCE_NOT_FOUND",
    });
  }
  return delivery;
};

export const deliveryService = {
  async list({ page, pageSize, sortBy, sortDirection, orderId, status }) {
    const where = {};
    if (orderId) where.orderId = orderId;
    if (status) where.status = status;

    const sortableFields = new Set(["createdAt", "updatedAt", "id"]);
    const order =
      sortBy && sortableFields.has(sortBy)
        ? [[sortBy, String(sortDirection).toUpperCase()]]
        : [["createdAt", "DESC"]];

    const { rows, count } = await db.Delivery.findAndCountAll({
      where,
      include: deliveryInclude,
      order,
      limit: pageSize,
      offset: (page - 1) * pageSize,
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

  async listForShopkeeper(shopkeeperId) {
    return db.Delivery.findAll({
      include: [
        {
          model: db.Order,
          as: "order",
          where: { shopkeeperId },
          required: true,
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  },

  async getById(id) {
    return getDeliveryOrThrow(id, { include: deliveryInclude });
  },

  async create({ payload, request }) {
    const deliveryPayload = filterDeliveryPayload(payload);
    return db.sequelize.transaction(async (transaction) => {
      const delivery = await db.Delivery.create(deliveryPayload, { transaction });
      await auditLogService.record({
        request,
        action: "CREATE",
        module: "delivery",
        entityType: "Delivery",
        entityId: delivery.id,
        newValue: delivery,
        transaction,
      });
      return delivery;
    });
  },

  async update({ id, payload, request }) {
    const delivery = await getDeliveryOrThrow(id);
    const oldValue = delivery.toJSON();
    const deliveryPayload = filterDeliveryPayload(payload);

    await db.sequelize.transaction(async (transaction) => {
      await delivery.update(deliveryPayload, { transaction });
      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "delivery",
        entityType: "Delivery",
        entityId: delivery.id,
        oldValue,
        newValue: delivery,
        transaction,
      });
    });

    return delivery;
  },
};
