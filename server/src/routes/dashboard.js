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

// GET /api/dashboard/chart-data
// Returns last 7 days order trend data
router.get('/chart-data', async (req, res, next) => {
  try {
    // Mock 模式直接用 service
    if (isMock) {
      const data = service.getChartData();
      return res.json({ data });
    }

    // 真实模式：从 DB 按天聚合近 7 天订单数
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { purchaseDate: { gte: sevenDaysAgo } },
      select: { purchaseDate: true },
    });

    // 生成近7天日期 map
    const dateMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dateMap[key] = 0;
    }

    // 统计每天订单数
    orders.forEach(o => {
      const d = new Date(o.purchaseDate);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (key in dateMap) dateMap[key]++;
    });

    const orderTrend = Object.entries(dateMap).map(([date, count]) => ({ date, orders: count }));

    res.json({ data: { orderTrend } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
