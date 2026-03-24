require('dotenv').config();

// ── 全局错误保护（防止 SP-API 未配置时 unhandled rejection 崩溃进程）──
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection] Caught:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException] Caught:', err.message);
});

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;
const isMock = process.env.USE_MOCK === 'true';


// ── 中间件 ────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── 健康检查 ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 路由挂载 ──────────────────────────────────────────────
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/sync', require('./routes/sync'));

// ── 全局错误处理 ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

// ── 启动服务 ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} — Mock mode: ${isMock}`);
  // 启动定时同步任务（USE_MOCK=false 时生效）
  const { startScheduler } = require('./scheduler');
  startScheduler();
});
