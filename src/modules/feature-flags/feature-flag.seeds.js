/**
 * Default feature flags seeded on every app startup.
 * Add new entries here — they are upserted (created only if the key doesn't
 * already exist), so running the server again never duplicates them.
 */
export const DEFAULT_FEATURE_FLAGS = [
  {
    key: "b2c.customer.screen.enabled",
    name: "B2C Customer Screen",
    module: "Platform",
    description:
      "Controls whether the B2C (customer-facing) section is visible in the user application. " +
      "Toggle OFF to hide the entire B2C screen from end users.",
    isEnabled: true,
    environment: "all",
    targetAudience: "all",
    rolloutPercentage: 100,
    metadata: { tags: ["TOP_PRIORITY"] },
  },
  {
    key: "shopkeeper.registration.enabled",
    name: "New Shopkeeper Registration",
    module: "Shopkeeper",
    description: "Allow new shopkeepers to register through the app.",
    isEnabled: true,
    environment: "all",
    targetAudience: "all",
    rolloutPercentage: 100,
    metadata: null,
  },
];
