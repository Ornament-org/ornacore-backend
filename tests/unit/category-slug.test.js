import { nextAvailableCategorySlug } from "../../src/modules/categories/category.slug.js";

describe("category slug generation", () => {
  it("generates a normalized slug from the category name", () => {
    expect(nextAvailableCategorySlug("  Wedding Rings  ")).toBe("wedding-rings");
  });

  it("adds the next available suffix when a slug already exists", () => {
    expect(
      nextAvailableCategorySlug("Wedding Rings", [
        "wedding-rings",
        "wedding-rings-2",
        "wedding-rings-3",
      ]),
    ).toBe("wedding-rings-4");
  });
});
