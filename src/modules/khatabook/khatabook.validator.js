import { z } from "zod";

const id = z.coerce.number().int().positive();
const dateOnly = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);

const itemSchema = z.object({
  itemName: z.string().trim().min(1).max(191),
  grossWeight: z.coerce.number().positive(),
  tunch: z.coerce.number().positive(),
});

const optionalCollectionSchema = z
  .object({
    metalReceived: z.coerce.number().nonnegative().optional(),
    cashReceived: z.coerce.number().nonnegative().optional(),
    metalRate: z.coerce.number().positive().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((value) => !value.cashReceived || value.metalRate, {
    message: "Metal rate is required when cash collection is entered",
    path: ["metalRate"],
  });

export const shopkeeperParamSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ shopkeeperId: id }),
  // BUG-1: allow optional metalId for the payment-preview endpoint
  query: z.object({ metalId: id.optional() }).passthrough(),
});

export const ordersQuerySchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ shopkeeperId: id.optional() }).passthrough(),
  query: z
    .object({
      shopkeeperId: id.optional(),
      metalId: id.optional(),
      search: z.string().trim().max(191).optional(),
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(20),
    })
    .passthrough(),
});

export const orderParamSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ orderId: id }),
  query: z.object({}).passthrough(),
});

export const orderLedgerSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ orderId: id }),
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(50),
    })
    .passthrough(),
});

export const shopkeeperLedgerSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({ shopkeeperId: id }),
  query: z
    .object({
      metalId: id.optional(),
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(50),
    })
    .passthrough(),
});

export const ledgerQuerySchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      shopkeeperId: id,
      metalId: id.optional(),
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(50),
    })
    .passthrough(),
});

// Same shape as ledgerQuerySchema, minus shopkeeperId — the authenticated
// shopkeeper's own id is used instead, so a shop can only ever read its own
// ledger, never one supplied via the query string.
export const currentShopkeeperLedgerSchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z
    .object({
      metalId: id.optional(),
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().max(100).default(50),
    })
    .passthrough(),
});

export const createOrderSchema = z.object({
  body: z.object({
    shopkeeperId: id,
    metalId: id,
    orderNumber: z.string().trim().min(1).max(64).optional(),
    entryDate: z.coerce.date().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    cashDueAmount: z.coerce.number().nonnegative().optional(),
    items: z.array(itemSchema).min(1),
    collection: optionalCollectionSchema.optional(),
    overrideCreditLimit: z.coerce.boolean().default(false),
    sourceOrderIds: z.array(id).max(50).optional().default([]),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const metalsSummarySchema = z.object({
  body: z.unknown().optional(),
  params: z.object({}).passthrough(),
  query: z.object({ shopkeeperId: id }),
});

export const addMetalCollectionSchema = z.object({
  body: z.object({
    shopkeeperId: id.optional(),
    metalId: id.optional(),
    receivedQuantity: z.coerce.number().positive(),
    collectionDate: z.coerce.date().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  }),
  params: z.object({ orderId: id }),
  query: z.object({}).passthrough(),
});

export const addCashCollectionSchema = z.object({
  body: z.object({
    shopkeeperId: id.optional(),
    metalId: id.optional(),
    cashAmount: z.coerce.number().positive(),
    metalRate: z.coerce.number().positive(),
    collectionDate: z.coerce.date().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  }),
  params: z.object({ orderId: id }),
  query: z.object({}).passthrough(),
});

export const createAccountMetalCollectionSchema = addMetalCollectionSchema.extend({
  body: addMetalCollectionSchema.shape.body.extend({
    shopkeeperId: id,
    metalId: id,
  }),
  params: z.object({}).passthrough(),
});

export const createAccountCashCollectionSchema = addCashCollectionSchema.extend({
  body: addCashCollectionSchema.shape.body.extend({
    shopkeeperId: id,
    metalId: id,
  }),
  params: z.object({}).passthrough(),
});

export const createAccountMetalDueSchema = z.object({
  body: z.object({
    shopkeeperId: id,
    metalId: id,
    dueQuantity: z.coerce.number().positive(),
    entryDate: dateOnly.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const createAccountCashDueSchema = z.object({
  body: z.object({
    shopkeeperId: id,
    metalId: id,
    cashAmount: z.coerce.number().positive(),
    entryDate: dateOnly.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});
