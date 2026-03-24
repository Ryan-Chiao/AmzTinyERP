// routes/pricing.js — 定价模块路由（Phase 2）
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const isMock = process.env.USE_MOCK === 'true';

// Mock buyBoxStatus 确定性分配（用 asin hash）
function mockBuyBoxStatus(asin) {
  const hash = asin.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = hash % 10;
  if (r < 6) return 'won';      // 60%
  if (r < 9) return 'lost';     // 30%
  return 'unknown';              // 10%
}

// ─── GET /api/pricing ────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    if (isMock) {
      // Mock 数据：从内存 products 注入 buyBoxStatus
      const { products } = require('../mock/data');
      const data = products.map((p) => ({
        asin: p.asin,
        sku: p.sku,
        title: p.title,
        price: p.price ?? '0.00',
        priceFloor: p.priceFloor ?? null,
        priceCeiling: p.priceCeiling ?? null,
        buyBoxStatus: mockBuyBoxStatus(p.asin),
      }));
      return res.json({ data, total: data.length });
    }

    // 真实模式：从 DB 读取
    const products = await prisma.product.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        asin: true,
        sku: true,
        title: true,
        price: true,
        priceFloor: true,
        priceCeiling: true,
      },
    });

    const data = products.map((p) => ({
      ...p,
      price: p.price?.toString() ?? '0.00',
      priceFloor: p.priceFloor?.toString() ?? null,
      priceCeiling: p.priceCeiling?.toString() ?? null,
      // Phase 2：真实 buyBoxStatus 需接 SP-API Pricing，暂时返回 unknown
      buyBoxStatus: 'unknown',
    }));

    res.json({ data, total: data.length });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/pricing/:asin ─────────────────────────────
router.patch('/:asin', async (req, res, next) => {
  try {
    const { asin } = req.params;
    const { priceFloor, priceCeiling } = req.body;

    if (priceFloor === undefined && priceCeiling === undefined) {
      return res.status(400).json({ error: 'No valid fields provided', code: 'BAD_REQUEST' });
    }

    const data = {};
    if (priceFloor !== undefined) data.priceFloor = priceFloor === null ? null : parseFloat(priceFloor);
    if (priceCeiling !== undefined) data.priceCeiling = priceCeiling === null ? null : parseFloat(priceCeiling);

    if (isMock) {
      // Mock 模式：内存修改
      const { products } = require('../mock/data');
      const idx = products.findIndex((p) => p.asin === asin);
      if (idx === -1) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
      Object.assign(products[idx], data);
      return res.json({
        asin,
        ...data,
        buyBoxStatus: mockBuyBoxStatus(asin),
      });
    }

    const product = await prisma.product.update({
      where: { asin },
      data,
      select: { asin: true, sku: true, title: true, price: true, priceFloor: true, priceCeiling: true },
    });

    res.json({
      ...product,
      price: product.price?.toString(),
      priceFloor: product.priceFloor?.toString() ?? null,
      priceCeiling: product.priceCeiling?.toString() ?? null,
      buyBoxStatus: 'unknown',
    });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    next(err);
  }
});

module.exports = router;
