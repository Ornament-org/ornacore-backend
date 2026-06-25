# Accounts ledger

The ledger is a proper double-entry subsystem, not a mutable “due amount” column.

## Core records

- `ledger_accounts`: chart of accounts, including one receivable account per shopkeeper
- `journal_entries`: the business event header
- `journal_lines`: debit and credit lines

## Required invariants

1. A posted journal has at least two lines.
2. Total debits equal total credits in the same currency.
3. Every amount is positive; the `side` determines debit or credit.
4. Posted entries and lines are immutable.
5. Corrections use a reversal entry and a replacement entry.
6. Posting is idempotent for a given source event.
7. Balances are derived from posted journal lines, not directly edited.
8. Payments, credit sales, cash receipts, refunds, and manual adjustments each use documented journal
   templates.

## Future examples

Credit sale:

```text
Debit  Shopkeeper Accounts Receivable
Credit Jewelry Sales Revenue
```

Cash collection:

```text
Debit  Cash / Bank
Credit Shopkeeper Accounts Receivable
```

GST lines will be added only when tax rules are implemented. The journal model is already flexible
enough to add tax liability accounts later.
