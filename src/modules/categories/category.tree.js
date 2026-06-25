const normalizeRows = (rows) =>
  rows.map((row) => (typeof row.toJSON === "function" ? row.toJSON() : { ...row }));

export const createCategoryPathMap = (rows) => {
  const categories = normalizeRows(rows);
  const byId = new Map(categories.map((category) => [String(category.id), category]));
  const cache = new Map();

  const resolve = (category, visiting = new Set()) => {
    const key = String(category.id);
    if (cache.has(key)) return cache.get(key);
    if (visiting.has(key)) return { path: category.name, depth: 0, ancestorIds: [] };

    const nextVisiting = new Set(visiting).add(key);
    const parent = category.parentId ? byId.get(String(category.parentId)) : null;
    const result = parent
      ? (() => {
          const parentPath = resolve(parent, nextVisiting);
          return {
            path: `${parentPath.path} / ${category.name}`,
            depth: parentPath.depth + 1,
            ancestorIds: [...parentPath.ancestorIds, String(parent.id)],
          };
        })()
      : { path: category.name, depth: 0, ancestorIds: [] };

    cache.set(key, result);
    return result;
  };

  return new Map(categories.map((category) => [String(category.id), resolve(category)]));
};

export const buildCategoryTree = (rows) => {
  const categories = normalizeRows(rows).map((category) => ({ ...category, children: [] }));
  const byId = new Map(categories.map((category) => [String(category.id), category]));
  const roots = [];

  for (const category of categories) {
    const parent = category.parentId ? byId.get(String(category.parentId)) : null;
    if (parent && String(parent.id) !== String(category.id)) parent.children.push(category);
    else roots.push(category);
  }

  const sort = (items) => {
    items.sort(
      (left, right) =>
        Number(left.sortOrder) - Number(right.sortOrder) ||
        String(left.name).localeCompare(String(right.name)),
    );
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
};
