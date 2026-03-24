// routes/inventory.js
const express = require('express');
const router = express.Router();
const service = require('../services');

// GET /api/inventory
// Query: search (string), lowStockOnly (boolean)
router.get('/', (req, res, next) => {
  try {
    const { search, lowStockOnly } = req.query;
    let products = service.getInventory();

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.asin.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }

    if (lowStockOnly === 'true') {
      products = products.filter((p) => p.fbaAvailable <= p.reorderThreshold);
    }

    res.json({
      data: products,
      total: products.length,
      lastSyncAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/inventory/:asin
router.get('/:asin', (req, res, next) => {
  try {
    const products = service.getInventory();
    const product = products.find((p) => p.asin === req.params.asin);
    if (!product) {
      return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
