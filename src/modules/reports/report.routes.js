import { QueryTypes } from "sequelize";
import { PERMISSIONS } from "../../constants/permissions.js";
import db from "../../database/models/InitializeModels.js";
import { protectAdmin } from "../../shared/http/adminRoute.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";
import { createModuleRouter } from "../module.router.js";

export const reportAdminRouter = createModuleRouter();

reportAdminRouter.use(...protectAdmin(PERMISSIONS.REPORT_VIEW));

reportAdminRouter.get(
  "/dashboard",
  asyncHandler(async (_request, response) => {
    const [
      totalShopkeepers,
      pendingApproval,
      totalOrders,
      totalSales,
      orderStatus,
      recentOrders,
      salesTrend,
      topCategories,
      lowStock,
      dueRows,
    ] = await Promise.all([
      db.ShopkeeperProfile.count(),
      db.ShopkeeperProfile.count({ where: { status: "PENDING_REVIEW" } }),
      db.Order.count(),
      db.Order.sum("grandTotal", {
        where: { status: ["CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED"] },
      }),
      db.Order.findAll({
        attributes: ["status", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "value"]],
        group: ["status"],
        raw: true,
      }),
      db.Order.findAll({
        include: [{ model: db.ShopkeeperProfile, as: "shopkeeper" }],
        order: [["createdAt", "DESC"]],
        limit: 5,
      }),
      db.sequelize.query(
        `SELECT DATE(created_at) AS date, SUM(grand_total) AS sales
         FROM orders
         WHERE status IN ('CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED')
           AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        { type: QueryTypes.SELECT },
      ),
      db.sequelize.query(
        `SELECT c.name, SUM(oi.line_total) AS amount,
           SUM(oi.quantity) AS quantity
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         INNER JOIN products p ON p.id = oi.product_id
         INNER JOIN product_category_mappings pcm
           ON pcm.product_id = p.id AND pcm.is_primary = true
         INNER JOIN categories c ON c.id = pcm.category_id
         WHERE o.status IN ('CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED')
         GROUP BY c.id, c.name
         ORDER BY amount DESC
         LIMIT 5`,
        { type: QueryTypes.SELECT },
      ),
      db.Inventory.findAll({
        where: db.sequelize.where(
          db.sequelize.col("on_hand_quantity"),
          "<=",
          db.sequelize.col("reorder_level"),
        ),
        include: [
          {
            model: db.ProductVariant,
            as: "variant",
            include: [{ model: db.Product, as: "product" }],
          },
        ],
        order: [["onHandQuantity", "ASC"]],
        limit: 10,
      }),
      db.sequelize.query(
        `SELECT
           SUM(CASE WHEN jl.side = 'DEBIT' THEN jl.amount ELSE -jl.amount END) AS total_due
         FROM journal_lines jl
         INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
         INNER JOIN ledger_accounts la ON la.id = jl.ledger_account_id
         WHERE je.status = 'POSTED'
           AND la.owner_type = 'SHOPKEEPER'
           AND la.account_type = 'ASSET'`,
        { type: QueryTypes.SELECT },
      ),
    ]);

    const statusMap = Object.fromEntries(orderStatus.map((row) => [row.status, Number(row.value)]));
    const totalDue = Number(dueRows[0]?.total_due || 0);
    response.json(
      ApiResponse.success({
        data: {
          metrics: {
            totalShopkeepers,
            pendingApproval,
            totalOrders,
            totalSales: Number(totalSales || 0),
            totalDue,
          },
          orderStatus: Object.entries(statusMap).map(([name, value]) => ({
            name,
            value,
          })),
          recentOrders,
          salesTrend: salesTrend.map((row) => ({
            date: row.date,
            sales: Number(row.sales),
          })),
          topCategories: topCategories.map((row) => ({
            name: row.name,
            amount: Number(row.amount),
            quantity: Number(row.quantity),
          })),
          lowStock,
          dueAging: [
            { name: "0–30 Days", value: totalDue },
            { name: "31–60 Days", value: 0 },
            { name: "61–90 Days", value: 0 },
            { name: "90+ Days", value: 0 },
          ],
        },
      }),
    );
  }),
);

reportAdminRouter.get(
  "/sales",
  asyncHandler(async (_request, response) => {
    const rows = await db.sequelize.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS orders,
         SUM(grand_total) AS sales
       FROM orders
       WHERE status IN ('CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      { type: QueryTypes.SELECT },
    );
    response.json(ApiResponse.success({ data: rows }));
  }),
);

reportAdminRouter.get(
  "/inventory",
  asyncHandler(async (_request, response) => {
    const rows = await db.Inventory.findAll({
      include: [
        {
          model: db.ProductVariant,
          as: "variant",
          include: [{ model: db.Product, as: "product" }],
        },
      ],
      order: [["onHandQuantity", "ASC"]],
    });
    response.json(ApiResponse.success({ data: rows }));
  }),
);

reportAdminRouter.get(
  "/shopkeepers",
  asyncHandler(async (_request, response) => {
    const rows = await db.sequelize.query(
      `SELECT sp.id, sp.shop_name, sp.owner_name, sp.city, sp.status,
         sp.credit_limit, COUNT(DISTINCT o.id) AS orders,
         COALESCE(SUM(o.grand_total), 0) AS purchases,
         COALESCE((
           SELECT SUM(CASE WHEN jl.side = 'DEBIT' THEN jl.amount ELSE -jl.amount END)
           FROM ledger_accounts la
           INNER JOIN journal_lines jl ON jl.ledger_account_id = la.id
           INNER JOIN journal_entries je ON je.id = jl.journal_entry_id
           WHERE la.shopkeeper_id = sp.id AND je.status = 'POSTED'
         ), 0) AS due_amount
       FROM shopkeeper_profiles sp
       LEFT JOIN orders o ON o.shopkeeper_id = sp.id
       GROUP BY sp.id
       ORDER BY purchases DESC`,
      { type: QueryTypes.SELECT },
    );
    response.json(ApiResponse.success({ data: rows }));
  }),
);

reportAdminRouter.get(
  "/products",
  asyncHandler(async (_request, response) => {
    const rows = await db.sequelize.query(
      `SELECT p.id, p.design_code, p.name, p.status, c.name AS category,
         COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity ELSE 0 END), 0) AS quantity_sold,
         COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.line_total ELSE 0 END), 0) AS sales
       FROM products p
       INNER JOIN product_category_mappings pcm
         ON pcm.product_id = p.id AND pcm.is_primary = true
       INNER JOIN categories c ON c.id = pcm.category_id
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id
         AND o.status IN ('CONFIRMED', 'PACKED', 'DISPATCHED', 'DELIVERED')
       GROUP BY p.id, c.id
       ORDER BY sales DESC, p.name ASC`,
      { type: QueryTypes.SELECT },
    );
    response.json(ApiResponse.success({ data: rows }));
  }),
);

reportAdminRouter.get(
  "/payments",
  asyncHandler(async (_request, response) => {
    const rows = await db.sequelize.query(
      `SELECT DATE(received_at) AS date, method, COUNT(*) AS transactions,
         SUM(amount) AS amount
       FROM payments
       WHERE status = 'COMPLETED'
       GROUP BY DATE(received_at), method
       ORDER BY date DESC, method ASC`,
      { type: QueryTypes.SELECT },
    );
    response.json(ApiResponse.success({ data: rows }));
  }),
);

reportAdminRouter.get(
  "/orders",
  asyncHandler(async (_request, response) => {
    const rows = await db.Order.findAll({
      attributes: [
        "status",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "orders"],
        [db.sequelize.fn("SUM", db.sequelize.col("grand_total")), "value"],
      ],
      group: ["status"],
      order: [["status", "ASC"]],
      raw: true,
    });
    response.json(ApiResponse.success({ data: rows }));
  }),
);
