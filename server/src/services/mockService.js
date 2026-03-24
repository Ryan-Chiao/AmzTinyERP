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
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayOrdersList = orders.filter(
    (o) => new Date(o.purchaseDate) >= todayStart
  );
  const yesterdayOrdersList = orders.filter(
    (o) => new Date(o.purchaseDate) >= yesterdayStart && new Date(o.purchaseDate) < todayStart
  );
  const monthOrdersList = orders.filter(
    (o) => new Date(o.purchaseDate) >= monthStart
  );

  const sum = (list) =>
    list.reduce((acc, o) => acc + parseFloat(o.totalAmount), 0).toFixed(2);

  // 昨日随机数据（确定性：基于日期 seed）
  const seed = now.getDate() + now.getMonth() * 31;
  const yesterdayOrders = (seed % 6) + 3;                                  // 3-8
  const yesterdayRevenue = (200 + (seed * 17) % 600).toFixed(2);          // 200-800

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
    yesterdayOrders,
    yesterdayRevenue,
    todayNetRevenue: '--',
  };
}

/**
 * Chart data — 支持 metric + days 参数
 * @param {'revenue'|'netRevenue'|'quantity'} metric
 * @param {7|30} days
 */
function getChartData(metric = 'revenue', days = 7) {
  const now = new Date();
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const date = `${mm}-${dd}`;

    let value;
    if (metric === 'netRevenue') {
      value = null;  // 净销售额占位，前端显示 Empty
    } else if (metric === 'quantity') {
      value = 3 + Math.floor(Math.random() * 13);  // 3-15
    } else {
      value = parseFloat((200 + Math.random() * 600).toFixed(2));  // 200-800
    }
    series.push({ date, value });
  }
  return { metric, days, series };
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

/**
 * 今日热销 TOP10
 * @param {'child'|'parent'} groupBy
 */
function getTopAsins(groupBy = 'child') {
  // 为每个商品生成今日随机销量（基于 asin hash 确定性）
  const withSales = products.map((p) => {
    const hash = p.asin.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const quantity = 1 + (hash % 15);  // 1-15
    const coeff = 0.9 + (hash % 20) / 100;  // 0.9-1.1
    const revenue = parseFloat((quantity * parseFloat(p.price) * coeff).toFixed(2));
    return { ...p, quantity, revenue };
  });

  let rows;
  if (groupBy === 'parent') {
    const groups = {};
    withSales.forEach((p) => {
      const key = p.parentAsin || p.asin;
      if (!groups[key]) {
        groups[key] = { asin: key, parentAsin: p.parentAsin, title: p.title, imageUrl: p.imageUrl, quantity: 0, revenue: 0 };
      }
      groups[key].quantity += p.quantity;
      groups[key].revenue = parseFloat((groups[key].revenue + p.revenue).toFixed(2));
    });
    rows = Object.values(groups);
  } else {
    rows = withSales.map((p) => ({
      asin: p.asin, parentAsin: p.parentAsin,
      title: p.title, imageUrl: p.imageUrl,
      quantity: p.quantity, revenue: p.revenue,
    }));
  }

  rows.sort((a, b) => b.revenue - a.revenue);
  return rows.slice(0, 10).map((r, i) => ({ rank: i + 1, ...r, netRevenue: '--' }));
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
  getTopAsins,
};
