// routes/dashboard.js
const express = require('express');
const router = express.Router();
const service = require('../services');

// GET /api/dashboard/stats
router.get('/stats', (req, res, next) => {
  try {
    const stats = service.getDashboardStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/chart-data
// Returns last 7 days order trend data
router.get('/chart-data', (req, res, next) => {
  try {
    const data = service.getChartData();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
