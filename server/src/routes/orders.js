// routes/orders.js
const express = require('express');
const router = express.Router();
const service = require('../services');

// GET /api/orders
// Query: status, dateFrom, dateTo, page (default 1), pageSize (default 20)
router.get('/', async (req, res, next) => {
  try {
    const { status, dateFrom, dateTo } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));

    // FIXED: getOrders may be async (spApiService), must await
    const allOrders = await Promise.resolve(service.getOrders({ status, dateFrom, dateTo }));
    const safeOrders = Array.isArray(allOrders) ? allOrders : [];

    const total = safeOrders.length;
    const start = (page - 1) * pageSize;
    const data = safeOrders.slice(start, start + pageSize);

    res.json({ data, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:amazonOrderId
router.get('/:amazonOrderId', async (req, res, next) => {
  try {
    // FIXED: getOrderById may be async
    const order = await Promise.resolve(service.getOrderById(req.params.amazonOrderId));
    if (!order) {
      return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
