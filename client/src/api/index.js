import apiClient from './client';

export const getDashboardStats = () =>
  apiClient.get('/dashboard/stats').then((r) => r.data);

export const getInventory = (params) =>
  apiClient.get('/inventory', { params }).then((r) => r.data);

export const getInventoryItem = (asin) =>
  apiClient.get(`/inventory/${asin}`).then((r) => r.data);

export const getOrders = (params) =>
  apiClient.get('/orders', { params }).then((r) => r.data);

export const getOrderDetail = (orderId) =>
  apiClient.get(`/orders/${orderId}`).then((r) => r.data);

export const triggerSync = (module) =>
  apiClient.post('/sync/trigger', { module }).then((r) => r.data);

export const getChartData = (params = {}) =>
  apiClient.get('/dashboard/chart-data', { params }).then((r) => r.data);

export const getTopAsins = (params = {}) =>
  apiClient.get('/dashboard/top-asins', { params }).then((r) => r.data);

