// spApiService.js — SP-API stub, not yet implemented
// All functions throw until real integration is built in Phase 2+

/**
 * TODO: GET /fba/inventory/v1/summaries
 */
function getInventory() {
  throw new Error('SP-API not yet implemented');
}

/**
 * TODO: GET /orders/v0/orders
 * @param {Object} filters - { status, dateFrom, dateTo }
 */
function getOrders(filters) {
  throw new Error('SP-API not yet implemented');
}

/**
 * TODO: GET /orders/v0/orders/{orderId}
 * @param {string} amazonOrderId
 */
function getOrderById(amazonOrderId) {
  throw new Error('SP-API not yet implemented');
}

/**
 * Aggregated stats — dependent on SP-API data
 */
function getDashboardStats() {
  throw new Error('SP-API not yet implemented');
}

/**
 * TODO: aggregate from GET /orders/v0/orders (group by purchaseDate)
 */
function getChartData() {
  throw new Error('SP-API not yet implemented');
}

module.exports = { getInventory, getOrders, getOrderById, getDashboardStats, getChartData };
