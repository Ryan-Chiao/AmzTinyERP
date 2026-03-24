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

module.exports = router;
