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
 * 此方法在 USE_MOCK=false 时由 routes/dashboard.js 直接用 Prisma 实现
 * 保留此 stub 供向后兼容
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

module.exports = {
  getInventory,
  getOrders,
  getOrderById,
  getOrderItems,
  getDashboardStats,
  getChartData,
};
