import { z } from "zod";
import { LEDGER_ENTRY_TYPES } from "./ledger.constants.js";

const entrySchema = z.object({
  entryType: z.enum(Object.values(LEDGER_ENTRY_TYPES)),
  metalId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive(),
  rate: z.coerce.number().nonnegative().nullable().optional(),
  amount: z.coerce.number().nonnegative().nullable().optional(),
  remarks: z.string().trim().max(1000).nullable().optional(),
});

export const createLedgerTransactionSchema = z.object({
  body: z.object({
    shopkeeperId: z.coerce.number().int().positive(),
    transactionDate: z.coerce.date().optional(),
    remarks: z.string().trim().max(2000).nullable().optional(),
    entries: z.array(entrySchema).min(1),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const updateLedgerTransactionSchema = z.object({
  body: z.object({
    transactionDate: z.coerce.date().optional(),
    remarks: z.string().trim().max(2000).nullable().optional(),
  }).refine((value) => Object.keys(value).length > 0),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const voidLedgerTransactionSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(3).max(2000),
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const idParamSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).passthrough(),
});

export const shopLedgerQuerySchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ shopId: z.coerce.number().int().positive() }),
  query: z.object({
    metalId: z.coerce.number().int().positive().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  }).passthrough(),
});
