// routes/inventory.js
const express = require('express');
const router = express.Router();
const service = require('../services');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const isMock = process.env.USE_MOCK === 'true';

// ─── GET /api/inventory ───────────────────────────────────
// Query: search (string), lowStockOnly (boolean)
router.get('/', async (req, res, next) => {
  try {
    const { search, lowStockOnly } = req.query;

    if (isMock) {
      let products = service.getInventory();
      if (search) {
        const q = search.toLowerCase();
        products = products.filter(
          (p) =>
            (p.title || '').toLowerCase().includes(q) ||
            (p.asin || '').toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q)
        );
      }
      if (lowStockOnly === 'true') {
        products = products.filter((p) => p.fbaAvailable <= p.reorderThreshold);
      }
      return res.json({ data: products, total: products.length, lastSyncAt: new Date().toISOString() });
    }

    // 真实模式：从 DB 查
    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { asin: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (lowStockOnly === 'true') {
      // fbaAvailable <= reorderThreshold
      where.fbaAvailable = { lte: prisma.product.fields?.reorderThreshold ?? undefined };
    }

    let products = await prisma.product.findMany({ where, orderBy: { updatedAt: 'desc' } });

    // 低库存过滤（Prisma 不支持字段互比，JS 层过滤）
    if (lowStockOnly === 'true') {
      products = products.filter((p) => p.fbaAvailable <= p.reorderThreshold);
    }

    const lastSync = await prisma.syncLog.findFirst({
      where: { module: 'INVENTORY', status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    res.json({
      data: products,
      total: products.length,
      lastSyncAt: lastSync?.createdAt?.toISOString() || null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/inventory/:asin ─────────────────────────────
router.get('/:asin', async (req, res, next) => {
  try {
    const { asin } = req.params;

    if (isMock) {
      const products = service.getInventory();
      const product = products.find((p) => p.asin === asin);
      if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
      return res.json(product);
    }

    const product = await prisma.product.findUnique({ where: { asin } });
    if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/inventory/:asin ── T2: 更新补货参数 ─────────
router.patch('/:asin', async (req, res, next) => {
  try {
    const { asin } = req.params;
    const { leadTimeDays, safetyBufferDays, reorderThreshold, salesWindowDays } = req.body;

    if (isMock) {
      const updated = service.updateProduct(asin, { leadTimeDays, safetyBufferDays, reorderThreshold, salesWindowDays });
      if (!updated) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
      return res.json(updated);
    }

    // 只更新传入的字段
    const data = {};
    if (leadTimeDays !== undefined) data.leadTimeDays = Number(leadTimeDays);
    if (safetyBufferDays !== undefined) data.safetyBufferDays = Number(safetyBufferDays);
    if (reorderThreshold !== undefined) data.reorderThreshold = Number(reorderThreshold);
    if (salesWindowDays !== undefined) data.salesWindowDays = Number(salesWindowDays);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided', code: 'BAD_REQUEST' });
    }

    const product = await prisma.product.update({ where: { asin }, data });
    res.json(product);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    next(err);
  }
});

// ─── GET /api/inventory/:asin/restock-suggestion ─────────── T1
router.get('/:asin/restock-suggestion', async (req, res, next) => {
  try {
    const { asin } = req.params;

    if (isMock) {
      const suggestion = service.getRestockSuggestion(asin);
      if (!suggestion) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
      return res.json(suggestion);
    }

    // 真实模式：从 DB 聚合
    const product = await prisma.product.findUnique({ where: { asin } });
    if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });

    const salesWindowDays = product.salesWindowDays ?? 30;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - salesWindowDays);

    // 按 asin 聚合近 N 天销量
    const items = await prisma.orderItem.findMany({
      where: {
        asin,
        order: { purchaseDate: { gte: windowStart } },
      },
      select: { quantity: true },
    });

    const totalQty = items.reduce((acc, i) => acc + (i.quantity || 0), 0);

    if (totalQty === 0) {
      return res.json({ asin, dailySales: 0, restockQty: 0, stockoutDate: null, dataSource: 'no_data' });
    }

    const dailySales = parseFloat((totalQty / salesWindowDays).toFixed(2));
    const leadTimeDays = product.leadTimeDays ?? 30;
    const safetyBufferDays = product.safetyBufferDays ?? 7;
    const fbaAvailable = product.fbaAvailable ?? 0;

    const restockQty = Math.max(0, Math.ceil(dailySales * (leadTimeDays + safetyBufferDays) - fbaAvailable));

    let stockoutDate = null;
    if (dailySales > 0 && fbaAvailable > 0) {
      const daysLeft = Math.floor(fbaAvailable / dailySales);
      const d = new Date();
      d.setDate(d.getDate() + daysLeft);
      stockoutDate = d.toISOString().split('T')[0];
    }

    res.json({ asin, dailySales, restockQty, stockoutDate, dataSource: 'db' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/inventory/:asin/snapshots ──────────────────── T3
router.get('/:asin/snapshots', async (req, res, next) => {
  try {
    const { asin } = req.params;
    const days = Math.min(180, Math.max(7, parseInt(req.query.days) || 30));

    if (isMock) {
      const result = service.getInventorySnapshots(asin, days);
      if (!result) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
      return res.json(result);
    }

    // 真实模式：从 InventorySnapshot 查
    const product = await prisma.product.findUnique({ where: { asin }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });

    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await prisma.inventorySnapshot.findMany({
      where: { productId: product.id, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'asc' },
      select: { recordedAt: true, fbaAvailable: true, fbaInbound: true },
    });

    res.json({
      asin,
      snapshots: rows.map((r) => ({
        recordedAt: r.recordedAt.toISOString(),
        fbaAvailable: r.fbaAvailable,
        fbaInbound: r.fbaInbound,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
