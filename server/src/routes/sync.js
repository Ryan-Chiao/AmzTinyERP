// routes/sync.js
const express = require('express');
const router = express.Router();

const VALID_MODULES = ['INVENTORY', 'ORDERS', 'ALL'];

// POST /api/sync/trigger
// Body: { module: "INVENTORY" | "ORDERS" | "ALL" }
router.post('/trigger', async (req, res, next) => {
  try {
    const { module } = req.body;

    if (!module || !VALID_MODULES.includes(module.toUpperCase())) {
      return res.status(400).json({
        error: `Invalid module. Must be one of: ${VALID_MODULES.join(', ')}`,
        code: 'INVALID_MODULE',
      });
    }

    const isMock = process.env.USE_MOCK === 'true';

    if (isMock) {
      // Simulate sync delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const log = {
        id: `sync_${Date.now()}`,
        module: module.toUpperCase(),
        triggerType: 'MANUAL',
        status: 'SUCCESS',
        errorMessage: null,
        recordCount: module.toUpperCase() === 'INVENTORY' ? 6 : module.toUpperCase() === 'ORDERS' ? 10 : 16,
        durationMs: 500,
        createdAt: new Date().toISOString(),
      };

      return res.json({ success: true, log });
    }

    // Real mode — not yet implemented
    return res.status(501).json({ error: 'SP-API sync not yet implemented', code: 'NOT_IMPLEMENTED' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
