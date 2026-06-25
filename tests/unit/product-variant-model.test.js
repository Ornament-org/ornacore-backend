import db from "../../src/database/models/InitializeModels.js";

describe("product variant model", () => {
  it("defines tunch as a decimal jewelry detail", () => {
    const attribute = db.ProductVariant.getAttributes().tunch;

    expect(attribute).toBeDefined();
    expect(attribute.allowNull).toBe(true);
    expect(attribute.type.options.precision).toBe(5);
    expect(attribute.type.options.scale).toBe(2);
  });
});
