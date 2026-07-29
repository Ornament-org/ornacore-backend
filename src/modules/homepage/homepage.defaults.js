// Every type here has a real, matching component on the storefront (see
// SECTION_COMPONENTS in ornacore-web's HomePage.jsx) — this list is the
// single source of truth for what CAN exist on the homepage, so it never
// drifts from what's actually rendered.
export const SECTION_TYPES = [
  "BANNERS",
  "RATE_BANNER",
  "QUICK_CATEGORIES",
  "TRENDING_PRODUCTS",
  "TRUST_SECTION",
  "COLLECTIONS",
];

export const AUDIENCE_TYPES = ["B2B", "B2C", "GLOBAL"];

const section = (sectionType, overrides = {}) => ({
  sectionType,
  sectionKey: sectionType.toLowerCase(),
  title: null,
  subtitle: null,
  config: {},
  isActive: true,
  ...overrides,
});

export const DEFAULT_HOMEPAGES = {
  HOME_B2B: {
    homepageKey: "HOME_B2B",
    audienceType: "B2B",
    title: "Default B2B Homepage",
    sections: [
      section("BANNERS"),
      section("COLLECTIONS", { title: "Our Collections", config: { collectionIds: [] } }),
      section("QUICK_CATEGORIES", { title: "Shop by Category", config: { maxItems: 16 } }),
      section("TRENDING_PRODUCTS", { title: "Top Picks for Your Business", config: { limit: 6 } }),
      section("TRUST_SECTION", { title: "Why Partner With Us?" }),
      section("RATE_BANNER", { config: { showChange: true } }),
    ],
  },
  HOME_B2C: {
    homepageKey: "HOME_B2C",
    audienceType: "B2C",
    title: "Default B2C Homepage",
    sections: [
      section("BANNERS"),
      section("COLLECTIONS", { title: "Our Collections", config: { collectionIds: [] } }),
      section("QUICK_CATEGORIES", { title: "Shop by Category", config: { maxItems: 16 } }),
      section("TRUST_SECTION", { title: "Why Partner With Us?" }),
    ],
  },
};

export const systemDefaultFor = (audience) => {
  const template =
    Object.values(DEFAULT_HOMEPAGES).find((item) => item.audienceType === audience) ??
    DEFAULT_HOMEPAGES.HOME_B2B;
  return {
    homepage: {
      homepageKey: template.homepageKey,
      audienceType: template.audienceType,
      metalId: null,
      title: template.title,
      source: "SYSTEM_DEFAULT",
    },
    sections: template.sections.map((item, index) => ({
      sectionType: item.sectionType,
      sectionKey: item.sectionKey,
      title: item.title,
      subtitle: item.subtitle,
      config: item.config ?? {},
      sortOrder: index,
    })),
  };
};
