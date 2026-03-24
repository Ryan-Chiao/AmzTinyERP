// mockService.js — mirrors real SP-API service signatures, returns mock data
const { products, orders, syncLogs, mockChartData } = require('../mock/data');

const lastSyncAt = new Date().toISOString();

/**
 * GET /fba/inventory/v1/summaries (mock)
 */
function getInventory() {
  return products;
}

/**
 * GET /orders/v0/orders (mock)
 * @param {Object} filters - { status, dateFrom, dateTo }
 */
function getOrders(filters = {}) {
  let result = [...orders];

  if (filters.status) {
    result = result.filter((o) => o.status === filters.status.toUpperCase());
  }
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    result = result.filter((o) => new Date(o.purchaseDate) >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    result = result.filter((o) => new Date(o.purchaseDate) <= to);
  }

  return result;
}

/**
 * GET /orders/v0/orders/{orderId} (mock)
 * @param {string} amazonOrderId
 */
function getOrderById(amazonOrderId) {
  return orders.find((o) => o.amazonOrderId === amazonOrderId) || null;
}

/**
 * Aggregated dashboard statistics
 */
function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayOrdersList = orders.filter(
    (o) => new Date(o.purchaseDate) >= todayStart
  );
  const monthOrdersList = orders.filter(
    (o) => new Date(o.purchaseDate) >= monthStart
  );

  const sum = (list) =>
    list.reduce((acc, o) => acc + parseFloat(o.totalAmount), 0).toFixed(2);

  return {
    totalSkus: products.length,
    lowStockCount: products.filter(
      (p) => p.fbaAvailable <= p.reorderThreshold
    ).length,
    todayOrders: todayOrdersList.length,
    todayRevenue: sum(todayOrdersList),
    monthOrders: monthOrdersList.length,
    monthRevenue: sum(monthOrdersList),
    lastSyncAt,
  };
}

/**
 * Chart data — 近7天订单趋势
 */
function getChartData() {
  return mockChartData;
}

/**
 * T1: 补货建议（Mock 模式）
 * dailySales 用 asin 字符串 hash 确定性随机，范围 1-5 件/天
 * @param {string} asin
 * @returns {{ asin, dailySales, restockQty, stockoutDate, dataSource }}
 */
function getRestockSuggestion(asin) {
  const product = products.find((p) => p.asin === asin);
  if (!product) return null;

  // 确定性 hash：同一 asin 每次返回相同 dailySales
  const hash = asin.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const dailySales = parseFloat(((hash % 5) + 1).toFixed(1)); // 1-5

  const fbaAvailable = product.fbaAvailable ?? 0;
  const leadTimeDays = product.leadTimeDays ?? 30;
  const safetyBufferDays = product.safetyBufferDays ?? 7;

  const restockQty = Math.max(
    0,
    Math.ceil(dailySales * (leadTimeDays + safetyBufferDays) - fbaAvailable)
  );

  let stockoutDate = null;
  if (dailySales > 0 && fbaAvailable > 0) {
    const daysLeft = Math.floor(fbaAvailable / dailySales);
    const d = new Date();
    d.setDate(d.getDate() + daysLeft);
    stockoutDate = d.toISOString().split('T')[0];
  }

  return { asin, dailySales, restockQty, stockoutDate, dataSource: 'mock' };
}

/**
 * T2: 更新产品补货参数（Mock 模式：内存修改，重启后重置）
 * @param {string} asin
 * @param {{ leadTimeDays?, safetyBufferDays?, reorderThreshold?, salesWindowDays? }} data
 */
function updateProduct(asin, data) {
  const idx = products.findIndex((p) => p.asin === asin);
  if (idx === -1) return null;
  const allowed = ['leadTimeDays', 'safetyBufferDays', 'reorderThreshold', 'salesWindowDays'];
  allowed.forEach((k) => {
    if (data[k] !== undefined) products[idx][k] = data[k];
  });
  return products[idx];
}

/**
 * T3: 库存历史快照（Mock 模式：动态生成近 N 天模拟数据）
 * @param {string} asin
 * @param {number} days
 */
function getInventorySnapshots(asin, days = 30) {
  const product = products.find((p) => p.asin === asin);
  if (!product) return null;

  const base = product.fbaAvailable ?? 50;
  const snapshots = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(10, 0, 0, 0);
    // 小幅波动：±10%
    const noise = Math.round((Math.random() - 0.5) * base * 0.2);
    snapshots.push({
      recordedAt: d.toISOString(),
      fbaAvailable: Math.max(0, base + noise),
      fbaInbound: product.fbaInbound ?? 0,
    });
  }
  return { asin, snapshots };
}

module.exports = {
  getInventory,
  getOrders,
  getOrderById,
  getDashboardStats,
  getChartData,
  getRestockSuggestion,
  updateProduct,
  getInventorySnapshots,
};
