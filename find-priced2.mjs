import "dotenv/config";
import db from "./src/database/models/InitializeModels.js";
import { pricingService } from "./src/modules/pricing/pricing.service.js";

const user = await db.User.findOne({ where: { email: "aman@gmail.com" } });
console.log("user:", user?.id, user?.email);
const profile = await db.ShopkeeperProfile.findOne({ where: { userId: user.id } });
console.log("profile:", profile?.id, profile?.shopName, profile?.status);

const variants = await db.ProductVariant.findAll({
  where: { isActive: true },
  include: [
    { model: db.Product, as: "product" },
    { model: db.Inventory, as: "inventory", required: false },
  ],
});

for (const v of variants) {
  const inv = v.inventory;
  const available = inv ? Number(inv.onHandQuantity) - Number(inv.reservedQuantity) - Number(inv.damagedQuantity) : 0;
  let price = "NO_PRICE";
  try {
    const result = await pricingService.calculateVariantPrice({ shopkeeper: profile, variant: v, quantity: 1 });
    price = result.unitPrice.toFixed(2);
  } catch (e) {
    price = `ERR:${e.code ?? e.message}`;
  }
  console.log(`variant=${v.id} "${v.product?.name}" available=${available} price=${price}`);
}
process.exit(0);
