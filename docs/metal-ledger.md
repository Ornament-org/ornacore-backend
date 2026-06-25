# Metal Ledger System

## Business Goal

Build a Metal Ledger System that maintains a complete history of every delivery and receipt, calculates real-time running balance, shows transaction timelines, supports multiple metals, and provides audit-ready data for reports, recovery tracking, and future AI insights.

## Objective

For a particular shop, the system must answer:

- How much metal have we given?
- How much metal have we received?
- How much metal is currently due?

## Design Rule

Do not store `deliveredQty`, `receivedQty`, `currentDue`, `runningBalance`, or `pendingGold` as mutable totals.

Store immutable transactions and entries. Calculate balances from posted entries:

```txt
SUM(DELIVERY + ADJUSTMENT) - SUM(RECEIPT + RETURN)
```

Voided transactions are excluded from balance calculations.

## Tables

`ledger_transactions`

- `id`
- `shopkeeper_id`
- `transaction_no`
- `transaction_date`
- `remarks`
- `status`: `POSTED`, `VOID`
- `created_by_user_id`
- `updated_by_user_id`
- `voided_by_user_id`
- `voided_at`
- `void_reason`

`ledger_entries`

- `id`
- `ledger_transaction_id`
- `entry_type`: `DELIVERY`, `RECEIPT`, `ADJUSTMENT`, `RETURN`
- `metal_id`
- `quantity`
- `rate`
- `amount`
- `remarks`

## API

Admin:

- `GET /api/v1/admin/shops/:shopId/ledger/summary`
- `GET /api/v1/admin/shops/:shopId/ledger/timeline`
- `POST /api/v1/admin/ledger-transactions`
- `GET /api/v1/admin/ledger-transactions/:id`
- `PATCH /api/v1/admin/ledger-transactions/:id` for metadata only; quantity corrections must use void + correction transaction
- `POST /api/v1/admin/ledger-transactions/:id/void`

Shopkeeper:

- `GET /api/v1/shopkeeper/ledger/summary`
- `GET /api/v1/shopkeeper/ledger/timeline`

## Summary Response

```json
[
  {
    "metalId": "1",
    "code": "GOLD",
    "name": "Gold",
    "delivered": "140.000",
    "received": "60.000",
    "due": "80.000"
  }
]
```

## Example Transaction

```json
{
  "shopkeeperId": 4,
  "transactionDate": "2026-06-22",
  "remarks": "Sales visit",
  "entries": [
    { "entryType": "DELIVERY", "metalId": 1, "quantity": 100 },
    { "entryType": "RECEIPT", "metalId": 1, "quantity": 30 }
  ]
}
```
