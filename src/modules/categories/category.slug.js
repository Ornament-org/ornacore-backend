import { slugify } from "../../shared/utils/slugify.js";

export const nextAvailableCategorySlug = (name, existingSlugs = []) => {
  const baseSlug = slugify(name) || "category";
  const used = new Set(existingSlugs);
  if (!used.has(baseSlug)) return baseSlug;

  let suffix = 2;
  while (used.has(`${baseSlug}-${suffix}`)) suffix += 1;
  return `${baseSlug}-${suffix}`;
};
