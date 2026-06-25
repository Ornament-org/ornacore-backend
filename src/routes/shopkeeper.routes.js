import { Router } from "express";
import { shopkeeperAuthRouter } from "../modules/auth/auth.routes.js";
import { shopkeeperProfileRouter } from "../modules/shopkeepers/shopkeeper.routes.js";
import { metalShopkeeperRouter } from "../modules/metals/metal.routes.js";
import { categoryShopkeeperRouter } from "../modules/categories/category.routes.js";
import { productShopkeeperRouter } from "../modules/products/product.routes.js";
import { cartShopkeeperRouter } from "../modules/carts/cart.routes.js";
import { orderShopkeeperRouter } from "../modules/orders/order.routes.js";
import { paymentShopkeeperRouter } from "../modules/payments/payment.routes.js";
import { deliveryShopkeeperRouter } from "../modules/delivery/delivery.routes.js";
import { notificationShopkeeperRouter } from "../modules/notifications/notification.routes.js";
import { accountsLedgerShopkeeperRouter } from "../modules/accounts-ledger/accounts-ledger.routes.js";
import { metalLedgerShopkeeperRouter } from "../modules/metal-ledger/ledger.routes.js";

const router = Router();

router.use("/auth", shopkeeperAuthRouter);
router.use("/profile", shopkeeperProfileRouter);
router.use("/metals", metalShopkeeperRouter);
router.use("/categories", categoryShopkeeperRouter);
router.use("/products", productShopkeeperRouter);
router.use("/cart", cartShopkeeperRouter);
router.use("/orders", orderShopkeeperRouter);
router.use("/payments", paymentShopkeeperRouter);
router.use("/delivery", deliveryShopkeeperRouter);
router.use("/notifications", notificationShopkeeperRouter);
router.use("/accounts-ledger", accountsLedgerShopkeeperRouter);
router.use("/ledger", metalLedgerShopkeeperRouter);

export default router;
