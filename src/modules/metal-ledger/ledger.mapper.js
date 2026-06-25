import Decimal from "decimal.js";

export const decimalString = (value, places = 3) => new Decimal(value ?? 0).toFixed(places);

export const mapEntry = (entry) => ({
  id: String(entry.id),
  entryType: entry.entryType,
  metalId: String(entry.metalId),
  metal: entry.metal
    ? {
        id: String(entry.metal.id),
        code: entry.metal.code,
        name: entry.metal.name,
      }
    : null,
  quantity: decimalString(entry.quantity),
  rate: entry.rate == null ? null : decimalString(entry.rate, 4),
  amount: entry.amount == null ? null : decimalString(entry.amount, 4),
  remarks: entry.remarks,
});

export const mapTransaction = (transaction) => ({
  id: String(transaction.id),
  shopkeeperId: String(transaction.shopkeeperId),
  transactionNo: transaction.transactionNo,
  transactionDate: transaction.transactionDate,
  remarks: transaction.remarks,
  status: transaction.status,
  voidedAt: transaction.voidedAt,
  voidReason: transaction.voidReason,
  entries: (transaction.entries ?? []).map(mapEntry),
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});

export const mapSummaryRow = ({ metal, delivered, received, due }) => ({
  metalId: String(metal.id),
  code: metal.code,
  name: metal.name,
  delivered: decimalString(delivered),
  received: decimalString(received),
  due: decimalString(due),
});
