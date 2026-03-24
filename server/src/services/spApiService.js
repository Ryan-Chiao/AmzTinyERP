/**
 * spApiService.js — Amazon SP-API 服务层
 * Phase 2: 真实 SP-API 集成
 *
 * 说明：
 * - USE_MOCK=false 时由 index.js 调用此模块
 * - 所有方法均通过 spApiClient（含自动 Token 刷新）发起请求
 * - 买家 PII（BuyerInfo）在 syncOrders 层丢弃，此处透传原始数据
 */

const { getSpApiClient } = require('./spApiClient');

const MARKETPLACE_ID = () => process.env.SP_API_MARKETPLACE_ID || 'ATVPDKIKX0DER';

/**
 * 获取 FBA 库存汇总
 * SP-API: GET /fba/inventory/v1/summaries
 * @returns {Array} 库存 summary 列表
 */
async function getInventory() {
  const client = getSpApiClient();
  const res = await client.get('/fba/inventory/v1/summaries', {
    params: {
      details: true,
      granularityType: 'Marketplace',
      granularityId: MARKETPLACE_ID(),
      marketplaceIds: MARKETPLACE_ID(),
    },
  });
  return res.data?.payload?.inventorySummaries || [];
}

/**
 * 获取订单列表
 * SP-API: GET /orders/v0/orders
 * @param {{ dateFrom?: string, dateTo?: string, status?: string }} filters
 * @returns {Array} 订单列表
 */
async function getOrders(filters = {}) {
  const client = getSpApiClient();
  const params = {
    MarketplaceIds: MARKETPLACE_ID(),
    // 默认拉最近 30 天
    CreatedAfter: filters.dateFrom || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  };
  if (filters.dateTo) params.CreatedBefore = filters.dateTo;
  if (filters.status) params.OrderStatuses = filters.status;

  const res = await client.get('/orders/v0/orders', { params });
  return res.data?.payload?.Orders || [];
}

/**
 * 获取单个订单详情
 * SP-API: GET /orders/v0/orders/{orderId}
 * @param {string} amazonOrderId
 */
async function getOrderById(amazonOrderId) {
  const client = getSpApiClient();
  const res = await client.get(`/orders/v0/orders/${amazonOrderId}`);
  return res.data?.payload || null;
}

/**
 * 获取订单商品明细
 * SP-API: GET /orders/v0/orders/{orderId}/orderItems
 * @param {string} amazonOrderId
 * @returns {Array} OrderItem 列表
 */
async function getOrderItems(amazonOrderId) {
  const client = getSpApiClient();
  const res = await client.get(`/orders/v0/orders/${amazonOrderId}/orderItems`);
  return res.data?.payload?.OrderItems || [];
}

/**
 * Dashboard 汇总统计（从 DB 聚合，不直接调 SP-API）
 * 保留此 stub 供向后兼容，真实逻辑在 routes/dashboard.js 用 Prisma 实现
 */
function getDashboardStats() {
  throw new Error('getDashboardStats: 请直接用 Prisma 从 DB 聚合，不走 SP-API');
}

/**
 * 图表数据（从 DB 聚合，不直接调 SP-API）
 */
function getChartData() {
  throw new Error('getChartData: 请直接用 Prisma 从 DB 聚合，不走 SP-API');
}

/**
 * T1: 补货建议 stub — 真实模式从 DB 聚合，路由层直接用 Prisma 实现
 */
function getRestockSuggestion(_asin) {
  throw new Error('getRestockSuggestion: 请在路由层用 Prisma 从 OrderItem 聚合日均销量');
}

/**
 * T2: 更新补货参数 stub — 路由层直接用 Prisma upsert
 */
function updateProduct(_asin, _data) {
  throw new Error('updateProduct: 请在路由层用 Prisma 更新');
}

/**
 * T3: 库存历史快照 stub — 路由层直接查 InventorySnapshot 表
 */
function getInventorySnapshots(_asin, _days) {
  throw new Error('getInventorySnapshots: 请在路由层用 Prisma 查询 InventorySnapshot');
}

/**
 * 补货建议（实际模式：从 DB 聚合 OrderItem 计算）
 * @param {string} asin
 */
async function getRestockSuggestion(asin) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const product = await prisma.product.findUnique({ where: { asin } });
  if (!product) return null;

  const salesWindowDays = product.salesWindowDays || 30;
  const since = new Date();
  since.setDate(since.getDate() - salesWindowDays);

  const items = await prisma.orderItem.findMany({
    where: {
      asin,
      order: { purchaseDate: { gte: since } },
    },
    select: { quantity: true },
  });

  if (items.length === 0) {
    return { asin, dailySales: 0, restockQty: 0, stockoutDate: null, dataSource: 'no_data' };
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const dailySales = parseFloat((totalQty / salesWindowDays).toFixed(2));
  const restockQty = Math.max(
    0,
    Math.ceil(dailySales * (product.leadTimeDays + product.safetyBufferDays) - product.fbaAvailable)
  );

  let stockoutDate = null;
  if (dailySales > 0 && product.fbaAvailable > 0) {
    const daysLeft = Math.floor(product.fbaAvailable / dailySales);
    const d = new Date();
    d.setDate(d.getDate() + daysLeft);
    stockoutDate = d.toISOString().split('T')[0];
  }

  return { asin, dailySales, restockQty, stockoutDate, dataSource: 'db' };
}

/**
 * 更新产品补货参数
 * @param {string} asin
 * @param {Object} data
 */
async function updateProduct(asin, data) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const allowed = ['leadTimeDays', 'safetyBufferDays', 'reorderThreshold', 'salesWindowDays'];
  const update = {};
  allowed.forEach((k) => { if (data[k] !== undefined) update[k] = data[k]; });
  return prisma.product.update({ where: { asin }, data: update });
}

/**
 * 库存历史快照
 * @param {string} asin
 * @param {number} days
 */
async function getInventorySnapshots(asin, days = 30) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const product = await prisma.product.findUnique({ where: { asin } });
  if (!product) return null;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const snapshots = await prisma.inventorySnapshot.findMany({
    where: { productId: product.id, recordedAt: { gte: since } },
    orderBy: { recordedAt: 'asc' },
    select: { recordedAt: true, fbaAvailable: true, fbaInbound: true },
  });
  return { asin, snapshots };
}

module.exports = {
  getInventory,
  getOrders,
  getOrderById,
  getOrderItems,
  getDashboardStats,
  getChartData,
  getRestockSuggestion,
  updateProduct,
  getInventorySnapshots,
};
