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
 * TODO: aggregate from GET /orders/v0/orders (group by purchaseDate) — mock
 */
function getChartData() {
  return mockChartData;
}

module.exports = { getInventory, getOrders, getOrderById, getDashboardStats, getChartData };
