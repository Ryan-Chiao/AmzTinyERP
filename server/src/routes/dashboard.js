// routes/dashboard.js
const express = require('express');
const router = express.Router();
const service = require('../services');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const isMock = process.env.USE_MOCK === 'true';

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    // Mock 模式直接用 service
    if (isMock) {
      const stats = service.getDashboardStats();
      return res.json(stats);
    }

    // 真实模式：从 DB 聚合
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSkus,
      products,
      todayOrders,
      monthOrders,
      lastSync,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.findMany({ select: { fbaAvailable: true, reorderThreshold: true } }),
      prisma.order.findMany({ where: { purchaseDate: { gte: todayStart } }, select: { totalAmount: true } }),
      prisma.order.findMany({ where: { purchaseDate: { gte: monthStart } }, select: { totalAmount: true } }),
      prisma.syncLog.findFirst({ where: { status: 'SUCCESS' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);

    const lowStockCount = products.filter(p => p.fbaAvailable <= p.reorderThreshold).length;
    const sum = (list) => list.reduce((acc, o) => acc + parseFloat(o.totalAmount), 0).toFixed(2);

    res.json({
      totalSkus,
      lowStockCount,
      todayOrders: todayOrders.length,
      todayRevenue: sum(todayOrders),
      monthOrders: monthOrders.length,
      monthRevenue: sum(monthOrders),
      lastSyncAt: lastSync?.createdAt?.toISOString() || null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/chart-data?metric=revenue&days=7
router.get('/chart-data', async (req, res, next) => {
  try {
    const metric = ['revenue', 'netRevenue', 'quantity'].includes(req.query.metric)
      ? req.query.metric : 'revenue';
    const days = [7, 30].includes(Number(req.query.days))
      ? Number(req.query.days) : 7;

    if (isMock) {
      const data = service.getChartData(metric, days);
      return res.json({ data });
    }

    // 真实模式：从 DB 按天聚合
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { purchaseDate: { gte: since } },
      select: { purchaseDate: true, totalAmount: true },
    });

    const dateMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dateMap[key] = { revenue: 0, quantity: 0 };
    }

    orders.forEach(o => {
      const d = new Date(o.purchaseDate);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (key in dateMap) {
        dateMap[key].revenue += parseFloat(o.totalAmount);
        dateMap[key].quantity++;
      }
    });

    const series = Object.entries(dateMap).map(([date, v]) => ({
      date,
      value: metric === 'netRevenue' ? null
           : metric === 'quantity'   ? v.quantity
           : parseFloat(v.revenue.toFixed(2)),
    }));

    res.json({ data: { metric, days, series } });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/top-asins?groupBy=child
router.get('/top-asins', async (req, res, next) => {
  try {
    const groupBy = req.query.groupBy === 'parent' ? 'parent' : 'child';

    if (isMock) {
      const data = service.getTopAsins(groupBy);
      return res.json({ data });
    }

    // 真实模式：stub（Phase 3 实现）
    res.json({ data: [] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

