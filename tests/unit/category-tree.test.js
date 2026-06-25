import {
  buildCategoryTree,
  createCategoryPathMap,
} from "../../src/modules/categories/category.tree.js";

const categories = [
  { id: 1, parentId: null, name: "Jewelry", sortOrder: 1 },
  { id: 2, parentId: 1, name: "Rings", sortOrder: 2 },
  { id: 3, parentId: 2, name: "Wedding Rings", sortOrder: 1 },
  { id: 4, parentId: 1, name: "Chains", sortOrder: 1 },
];

describe("category hierarchy", () => {
  it("builds paths and ancestor identifiers for arbitrary depth", () => {
    const paths = createCategoryPathMap(categories);

    expect(paths.get("3")).toEqual({
      path: "Jewelry / Rings / Wedding Rings",
      depth: 2,
      ancestorIds: ["1", "2"],
    });
  });

  it("builds a sorted nested category tree", () => {
    const tree = buildCategoryTree(categories);

    expect(tree).toHaveLength(1);
    expect(tree[0].children.map((category) => category.name)).toEqual(["Chains", "Rings"]);
    expect(tree[0].children[1].children[0].name).toBe("Wedding Rings");
  });
});
