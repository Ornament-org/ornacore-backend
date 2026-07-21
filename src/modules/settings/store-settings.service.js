import db from "../../database/models/InitializeModels.js";
import { auditLogService } from "../audit-logs/audit-log.service.js";

// Single-row settings table — always id=1. findOrCreate means a fresh database (before
// any admin has saved settings) still resolves instead of 404ing.
const SINGLETON_ID = 1;

const settingsFields = [
  "businessName", "displayName", "logo", "favicon", "currency", "timezone", "dateFormat",
];

const filterPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload ?? {}).filter(
      ([key, value]) => settingsFields.includes(key) && value !== undefined,
    ),
  );

const getOrCreate = async () => {
  const [settings] = await db.StoreSettings.findOrCreate({ where: { id: SINGLETON_ID } });
  return settings;
};

export const storeSettingsService = {
  async get() {
    return getOrCreate();
  },

  // Deliberately unpermissioned beyond authAdmin (see store-settings.routes.js) — every
  // staff member needs this for the sidebar/tab-title masthead, not just settings.view
  // holders. Keeps sensitive-ish fields (none currently, but future ones) out of scope by
  // only returning the three branding fields.
  async branding() {
    const settings = await getOrCreate();
    return {
      displayName: settings.displayName || null,
      logo: settings.logo || null,
      favicon: settings.favicon || null,
    };
  },

  async update({ payload, request }) {
    const settings = await getOrCreate();
    const oldValue = settings.toJSON();
    const data = filterPayload(payload);
    data.updatedByUserId = request?.auth?.sub ?? null;

    await db.sequelize.transaction(async (transaction) => {
      await settings.update(data, { transaction });
      await auditLogService.record({
        request,
        action: "UPDATE",
        module: "settings",
        entityType: "StoreSettings",
        entityId: settings.id,
        oldValue,
        newValue: settings,
        transaction,
      });
    });

    return settings;
  },
};
