import Decimal from "decimal.js";
import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";

const d = (v = 0) => new Decimal(v ?? 0);
const gm = (v) => Number(d(v).toDecimalPlaces(3, Decimal.ROUND_HALF_UP));

const parseLocalDate = (str) => {
  const [y, m, day] = str.split("-").map(Number);
  return new Date(y, m - 1, day);
};

const fmtLabel = (date) =>
  date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const sumByMetal = (rows, metalId, key) =>
  rows
    .filter((r) => String(r.metalId) === String(metalId))
    .reduce((acc, r) => acc.plus(d(r[key])), d(0));

const analyticsService = {
  async getShopkeeperOverview(shopkeeperId, startDate, endDate) {
    const now = new Date();

    const rangeStart = startDate
      ? parseLocalDate(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const rangeEndInclusive = endDate
      ? parseLocalDate(endDate)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // exclusive upper bound for DB queries (< next day)
    const rangeEndExclusive = new Date(
      rangeEndInclusive.getFullYear(),
      rangeEndInclusive.getMonth(),
      rangeEndInclusive.getDate() + 1,
    );

    const metals = await db.Metal.findAll({
      where: { isActive: true },
      order: [["displayOrder", "ASC"], ["id", "ASC"]],
      attributes: ["id", "name"],
    });

    const metalIds = metals.map((metal) => metal.id);
    if (!metalIds.length) {
      return {
        period: {
          startDate: toIsoDate(rangeStart),
          endDate:   toIsoDate(rangeEndInclusive),
          label: `${fmtLabel(rangeStart)} – ${fmtLabel(rangeEndInclusive)}`,
        },
        cards: [],
      };
    }

    const [allOrders, rangeOrders, rangeCollections, creditLimits] = await Promise.all([
      db.KhatabookOrder.findAll({
        where: { shopkeeperId, metalId: { [Op.in]: metalIds } },
        attributes: ["metalId", "outstandingDue"],
      }),
      db.KhatabookOrder.findAll({
        where: {
          shopkeeperId,
          metalId: { [Op.in]: metalIds },
          entryDate: { [Op.gte]: rangeStart, [Op.lt]: rangeEndExclusive },
        },
        attributes: ["metalId", "fineDelivered"],
      }),
      db.KhatabookCollection.findAll({
        where: {
          shopkeeperId,
          metalId: { [Op.in]: metalIds },
          collectionDate: { [Op.gte]: rangeStart, [Op.lt]: rangeEndExclusive },
        },
        attributes: ["metalId", "fineCredit"],
      }),
      db.ShopkeeperMetalCreditLimit.findAll({
        where: { shopkeeperId },
        attributes: ["metalId", "creditLimitGrams", "advanceBalance"],
      }),
    ]);

    const creditByMetal = new Map(creditLimits.map((cl) => [String(cl.metalId), cl]));

    const makeItems = (getValue) =>
      metals.map((metal) => ({
        metalId: Number(metal.id),
        metalName: metal.name,
        value: gm(getValue(metal.id)),
      }));

    const dueItems = makeItems((id) => sumByMetal(allOrders, id, "outstandingDue"));

    const deliveredItems = makeItems((id) => sumByMetal(rangeOrders, id, "fineDelivered"));

    const receivedItems = makeItems((id) => sumByMetal(rangeCollections, id, "fineCredit"));

    const creditItems = makeItems((id) => {
      const cl = creditByMetal.get(String(id));
      const limit       = d(cl?.creditLimitGrams ?? 0);
      const outstanding = sumByMetal(allOrders, id, "outstandingDue");
      return Decimal.max(0, limit.minus(outstanding));
    });

    const totalOf = (items) =>
      gm(items.reduce((acc, item) => acc.plus(item.value), d(0)));

    return {
      period: {
        startDate: toIsoDate(rangeStart),
        endDate:   toIsoDate(rangeEndInclusive),
        label: `${fmtLabel(rangeStart)} – ${fmtLabel(rangeEndInclusive)}`,
      },
      cards: [
        {
          type: "due",
          title: "Total Metal Due",
          total: totalOf(dueItems),
          unit: "gm",
          items: dueItems,
        },
        {
          type: "delivered",
          title: "Metal Delivered",
          total: totalOf(deliveredItems),
          unit: "gm",
          items: deliveredItems,
        },
        {
          type: "received",
          title: "Metal Received",
          total: totalOf(receivedItems),
          unit: "gm",
          items: receivedItems,
        },
        {
          type: "credit",
          title: "Available Credit",
          total: totalOf(creditItems),
          unit: "gm",
          items: creditItems,
        },
      ],
    };
  },
};

export { analyticsService };
