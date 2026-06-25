import db from "../../src/database/models/InitializeModels.js";

describe("model registry", () => {
  it("loads the core domain models and associations", () => {
    expect(db.User).toBeDefined();
    expect(db.ShopkeeperProfile).toBeDefined();
    expect(db.Product).toBeDefined();
    expect(db.ProductCategoryMapping).toBeDefined();
    expect(db.Order).toBeDefined();
    expect(db.LedgerAccount).toBeDefined();
    expect(db.JournalEntry.associations.lines).toBeDefined();
    expect(db.Product.associations.variants).toBeDefined();
    expect(db.Product.associations.categoryMappings).toBeDefined();
    expect(db.Product.associations.categories).toBeDefined();
  });
});
