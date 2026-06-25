import db from "../../src/database/models/InitializeModels.js";

describe("product category mapping model", () => {
  it("supports multiple categories with one primary marker", () => {
    const attributes = db.ProductCategoryMapping.getAttributes();

    expect(attributes.productId).toBeDefined();
    expect(attributes.categoryId).toBeDefined();
    expect(attributes.isPrimary.defaultValue).toBe(false);
    expect(attributes.primaryProductId.allowNull).toBe(true);
    expect(attributes.sortOrder.defaultValue).toBe(0);
  });

  it("does not keep a direct category foreign key on products", () => {
    expect(db.Product.getAttributes().categoryId).toBeUndefined();
  });
});
