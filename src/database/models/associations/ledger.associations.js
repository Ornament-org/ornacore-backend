export default function ledgerAssociations(db) {
  db.ShopkeeperProfile.hasMany(db.LedgerAccount, {
    foreignKey: "shopkeeperId",
    as: "ledgerAccounts",
  });
  db.LedgerAccount.belongsTo(db.ShopkeeperProfile, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });
  db.LedgerAccount.belongsTo(db.LedgerAccount, {
    foreignKey: "parentAccountId",
    as: "parentAccount",
  });
  db.LedgerAccount.hasMany(db.LedgerAccount, {
    foreignKey: "parentAccountId",
    as: "childAccounts",
  });

  db.JournalEntry.hasMany(db.JournalLine, {
    foreignKey: "journalEntryId",
    as: "lines",
  });
  db.JournalLine.belongsTo(db.JournalEntry, {
    foreignKey: "journalEntryId",
    as: "journalEntry",
  });
  db.LedgerAccount.hasMany(db.JournalLine, {
    foreignKey: "ledgerAccountId",
    as: "journalLines",
  });
  db.JournalLine.belongsTo(db.LedgerAccount, {
    foreignKey: "ledgerAccountId",
    as: "ledgerAccount",
  });
  db.JournalEntry.belongsTo(db.JournalEntry, {
    foreignKey: "reversalOfEntryId",
    as: "reversalOf",
  });

  db.ShopkeeperProfile.hasMany(db.LedgerTransaction, {
    foreignKey: "shopkeeperId",
    as: "metalLedgerTransactions",
  });
  db.LedgerTransaction.belongsTo(db.ShopkeeperProfile, {
    foreignKey: "shopkeeperId",
    as: "shopkeeper",
  });
  db.LedgerTransaction.belongsTo(db.User, {
    foreignKey: "createdByUserId",
    as: "createdBy",
  });
  db.LedgerTransaction.belongsTo(db.User, {
    foreignKey: "updatedByUserId",
    as: "updatedBy",
  });
  db.LedgerTransaction.belongsTo(db.User, {
    foreignKey: "voidedByUserId",
    as: "voidedBy",
  });
  db.LedgerTransaction.hasMany(db.LedgerEntry, {
    foreignKey: "ledgerTransactionId",
    as: "entries",
  });
  db.LedgerEntry.belongsTo(db.LedgerTransaction, {
    foreignKey: "ledgerTransactionId",
    as: "transaction",
  });
  db.Metal.hasMany(db.LedgerEntry, {
    foreignKey: "metalId",
    as: "ledgerEntries",
  });
  db.LedgerEntry.belongsTo(db.Metal, {
    foreignKey: "metalId",
    as: "metal",
  });
}
