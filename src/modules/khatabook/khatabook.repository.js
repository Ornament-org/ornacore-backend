import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";

const orderInclude = [
  { model: db.Metal, as: "metal" },
  { model: db.KhatabookOrderItem, as: "items" },
  {
    model: db.KhatabookCollection,
    as: "collections",
    include: [{ model: db.KhatabookSettlement, as: "settlements" }],
  },
  {
    model: db.KhatabookSettlement,
    as: "settlements",
    include: [{ model: db.KhatabookCollection, as: "collection" }],
  },
];

export const khatabookRepository = {
  findShopkeeper(shopkeeperId, options = {}) {
    return db.ShopkeeperProfile.findByPk(shopkeeperId, {
      ...options,
      include: [
        { model: db.User, as: "user", attributes: ["id", "email", "mobile"] },
        {
          model: db.ShopkeeperMetalCreditLimit,
          as: "metalCreditLimits",
          include: [{ model: db.Metal, as: "metal" }],
        },
      ],
    });
  },

  findActiveMetals(options = {}) {
    return db.Metal.findAll({
      where: { isActive: true },
      order: [
        ["displayOrder", "ASC"],
        ["name", "ASC"],
      ],
      ...options,
    });
  },

  findMetalById(metalId, options = {}) {
    return db.Metal.findByPk(metalId, options);
  },

  createOrder(payload, options = {}) {
    return db.KhatabookOrder.create(payload, options);
  },

  bulkCreateItems(items, options = {}) {
    return db.KhatabookOrderItem.bulkCreate(items, options);
  },

  findOrderById(orderId, options = {}) {
    return db.KhatabookOrder.findByPk(orderId, { include: orderInclude, ...options });
  },

  findOrders({ shopkeeperId, metalId, search, limit, offset }, options = {}) {
    // BUG-7: only scope to shopkeeper when provided; omitting returns all (admin global view)
    const where = {};
    if (shopkeeperId) where.shopkeeperId = shopkeeperId;
    if (metalId) where.metalId = metalId;
    if (search) {
      where[Op.or] = [
        { orderNumber: { [Op.like]: `%${search}%` } },
        { notes: { [Op.like]: `%${search}%` } },
      ];
    }
    return db.KhatabookOrder.findAndCountAll({
      where,
      include: orderInclude,
      distinct: true,
      order: [
        ["entryDate", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
      ...options,
    });
  },

  findMetalOrdersForSettlement(shopkeeperId, metalId, options = {}) {
    return db.KhatabookOrder.findAll({
      where: { shopkeeperId, metalId },
      order: [
        ["entryDate", "ASC"],
        ["id", "ASC"],
      ],
      ...options,
    });
  },

  findMetalCollections(shopkeeperId, metalId, options = {}) {
    return db.KhatabookCollection.findAll({
      where: { shopkeeperId, metalId },
      order: [
        ["collectionDate", "ASC"],
        ["id", "ASC"],
      ],
      ...options,
    });
  },

  createCollection(payload, options = {}) {
    return db.KhatabookCollection.create(payload, options);
  },

  // BUG-8: Sequelize destroy() does not support `include`. Use a subquery approach instead.
  async deleteSettlements(shopkeeperId, metalId, options = {}) {
    const collections = await db.KhatabookCollection.findAll({
      where: { shopkeeperId, metalId },
      attributes: ["id"],
      ...options,
    });
    if (!collections.length) return 0;
    return db.KhatabookSettlement.destroy({
      where: { collectionId: collections.map((c) => c.id) },
      ...options,
    });
  },

  deleteLedgerEntries(shopkeeperId, metalId, options = {}) {
    return db.KhatabookLedgerEntry.destroy({ where: { shopkeeperId, metalId }, ...options });
  },

  bulkCreateSettlements(rows, options = {}) {
    if (!rows.length) return [];
    return db.KhatabookSettlement.bulkCreate(rows, options);
  },

  bulkCreateLedgerEntries(rows, options = {}) {
    if (!rows.length) return [];
    return db.KhatabookLedgerEntry.bulkCreate(rows, options);
  },

  async findLedger({ shopkeeperId, metalId, orderId, limit, offset }, options = {}) {
    const where = { shopkeeperId };
    if (metalId) where.metalId = metalId;

    // BUG-9: $alias.col$ in where with findAndCountAll produces wrong COUNT.
    // Resolve the collection IDs that reference this order first, then filter by PK/FK only.
    if (orderId) {
      const sourceCollectionIds = await db.KhatabookCollection.findAll({
        where: { sourceOrderId: orderId },
        attributes: ["id"],
        ...options,
      }).then((rows) => rows.map((r) => r.id));

      where[Op.or] = [
        { khatabookOrderId: orderId },
        ...(sourceCollectionIds.length ? [{ collectionId: sourceCollectionIds }] : []),
      ];
    }

    return db.KhatabookLedgerEntry.findAndCountAll({
      where,
      include: [
        { model: db.Metal, as: "metal" },
        { model: db.KhatabookOrder, as: "order" },
        { model: db.KhatabookCollection, as: "collection" },
      ],
      order: [
        ["entryDate", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
      subQuery: false, // prevents wrong COUNT when limit+offset is combined with joins
      ...options,
    });
  },
};
