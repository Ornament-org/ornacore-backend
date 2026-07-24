import { QueryTypes } from "sequelize";
import db from "../../database/models/InitializeModels.js";
import { ApiResponse } from "../../shared/http/ApiResponse.js";

const validDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const dashboard = async (request, response) => {
  try {
    const start = validDate(request.query?.startDate);
    const end = validDate(request.query?.endDate);
    const startDate = start ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ?? new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const replacements = { startDate, endDate };
    const khatabookDateWhere = "ko.entry_date BETWEEN :startDate AND :endDate";
    const orderDateWhere = "o.created_at BETWEEN :startDate AND :endDate";

    const [
      totalShopkeepers,
      pendingApproval,
      totalOrders,
      totalSales,
      orderStatus,
      recentOrders,
      salesTrend,
      salesByMetal,
      topCategories,
      lowStock,
      dueRows,
    ] = await Promise.all([
      db.ShopkeeperProfile.count(),
      db.ShopkeeperProfile.count({ where: { status: "PENDING_REVIEW" } }),
      db.KhatabookOrder.count({ where: { entryDate: { [db.Sequelize.Op.between]: [startDate, endDate] } } }),
      db.KhatabookOrder.sum("fineDelivered", {
        where: { entryDate: { [db.Sequelize.Op.between]: [startDate, endDate] } },
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
        `SELECT DATE(ko.entry_date) AS date, SUM(ko.fine_delivered) AS sales
         FROM khatabook_orders ko
         WHERE ${khatabookDateWhere}
         GROUP BY DATE(ko.entry_date)
         ORDER BY date ASC`,
        { replacements, type: QueryTypes.SELECT },
      ),
      db.sequelize.query(
        `SELECT
           m.id AS metal_id,
           m.name,
           COALESCE(SUM(ko.fine_delivered), 0) AS value
         FROM metals m
         LEFT JOIN khatabook_orders ko
           ON ko.metal_id = m.id
          AND ko.entry_date BETWEEN :startDate AND :endDate
         WHERE m.is_active = true
         GROUP BY m.id, m.name
         ORDER BY value DESC`,
        { replacements, type: QueryTypes.SELECT },
      ),
      db.sequelize.query(
        `SELECT c.name,
           SUM(COALESCE(pv.weight_grams, 0) * oi.quantity) AS fine_weight,
           SUM(oi.quantity) AS quantity,
           COUNT(DISTINCT o.id) AS orders
         FROM order_items oi
         INNER JOIN orders o ON o.id = oi.order_id
         INNER JOIN product_variants pv ON pv.id = oi.product_variant_id
         INNER JOIN products p ON p.id = oi.product_id
         INNER JOIN product_category_mappings pcm
           ON pcm.product_id = p.id AND pcm.is_primary = true
         INNER JOIN categories c ON c.id = pcm.category_id
         WHERE o.status != 'CANCELLED'
           AND ${orderDateWhere}
         GROUP BY c.id, c.name
         ORDER BY fine_weight DESC
         LIMIT 5`,
        { replacements, type: QueryTypes.SELECT },
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
            include: [
              {
                model: db.Product,
                as: "product",
                include: [{ model: db.Metal, as: "metal" }],
              },
            ],
          },
        ],
        order: [["onHandQuantity", "ASC"]],
        limit: 10,
      }),
      db.sequelize.query(
        `SELECT
           m.id AS metal_id,
           m.name,
           COALESCE(SUM(ko.outstanding_due), 0) AS value
         FROM metals m
         LEFT JOIN khatabook_orders ko ON ko.metal_id = m.id
         WHERE m.is_active = true
         GROUP BY m.id, m.name
         ORDER BY value DESC`,
        { type: QueryTypes.SELECT },
      ),
    ]);

    const statusMap = Object.fromEntries(orderStatus.map((row) => [row.status, Number(row.value)]));
    const totalDue = dueRows.reduce((sum, row) => sum + Number(row.value || 0), 0);
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
          salesByMetal: salesByMetal.map((row) => ({
            name: row.name,
            value: Number(row.value || 0),
          })),
          topCategories: topCategories.map((row) => ({
            name: row.name,
            amount: Number(row.fine_weight),
            quantity: Number(row.quantity),
            orders: Number(row.orders),
          })),
          lowStock,
          dueAging: dueRows.map((row) => ({
            name: row.name,
            value: Number(row.value || 0),
          })),
        },
      }),
    );
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const sales = async (_request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const inventory = async (_request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const shopkeepers = async (_request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const products = async (_request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const payments = async (_request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

const orders = async (_request, response) => {
  try {
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
  } catch (error) {
    response.status(error.statusCode || 500).json(
      ApiResponse.error({
        code: error.code || "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }),
    );
  }
};

export const reportController = {
  dashboard,
  sales,
  inventory,
  shopkeepers,
  products,
  payments,
  orders,
};
