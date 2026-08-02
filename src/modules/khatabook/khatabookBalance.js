import Decimal from "decimal.js";
import { Op } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { KHATABOOK_ADJUSTMENT_TYPES } from "./khatabook.constants.js";

const d = (value = 0) => new Decimal(value ?? 0);

const scopedWhere = ({ shopkeeperId, metalIds }) => {
  const where = { shopkeeperId };
  if (metalIds?.length) where.metalId = { [Op.in]: metalIds };
  return where;
};

export const getCurrentMetalDueMap = async ({
  shopkeeperId,
  metalIds = [],
  includeManualAdjustments = true,
  transaction,
}) => {
  const [orders, collections, adjustments] = await Promise.all([
    db.KhatabookOrder.findAll({
      where: scopedWhere({ shopkeeperId, metalIds }),
      attributes: ["id", "metalId", "fineDelivered", "entryDate"],
      transaction,
    }),
    db.KhatabookCollection.findAll({
      where: scopedWhere({ shopkeeperId, metalIds }),
      attributes: ["id", "metalId", "fineCredit", "collectionDate"],
      transaction,
    }),
    includeManualAdjustments
      ? db.KhatabookAdjustment.findAll({
        where: {
          ...scopedWhere({ shopkeeperId, metalIds }),
          adjustmentType: KHATABOOK_ADJUSTMENT_TYPES.METAL_DUE,
        },
        attributes: ["id", "metalId", "dueQuantity", "adjustmentDate"],
        transaction,
      }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const balances = new Map();
  const events = [
    ...orders.map((order) => ({
      rank: 1,
      id: Number(order.id),
      metalId: String(order.metalId),
      date: order.entryDate,
      debit: d(order.fineDelivered),
      credit: d(0),
    })),
    ...adjustments.map((adjustment) => ({
      rank: 2,
      id: Number(adjustment.id),
      metalId: String(adjustment.metalId),
      date: adjustment.adjustmentDate,
      debit: d(adjustment.dueQuantity),
      credit: d(0),
    })),
    ...collections.map((collection) => ({
      rank: 3,
      id: Number(collection.id),
      metalId: String(collection.metalId),
      date: collection.collectionDate,
      debit: d(0),
      credit: d(collection.fineCredit),
    })),
  ].sort(
    (a, b) =>
      new Date(a.date) - new Date(b.date) ||
      a.rank - b.rank ||
      a.id - b.id,
  );

  for (const event of events) {
    const current = balances.get(event.metalId) ?? d(0);
    const next = event.credit.gt(0)
      ? Decimal.max(0, current.minus(event.credit))
      : current.plus(event.debit);
    balances.set(event.metalId, next);
  }

  return balances;
};
