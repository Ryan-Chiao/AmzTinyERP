/**
 * scheduler.js — 定时同步任务
 * Phase 2: P2-4
 *
 * 仅在 USE_MOCK=false 时启用
 */

const cron = require('node-cron');
const { syncInventory, syncOrders } = require('./services/syncService');

function startScheduler() {
  if (process.env.USE_MOCK === 'true') {
    console.log('[Scheduler] USE_MOCK=true，跳过定时任务');
    return;
  }

  // 每小时同步一次库存
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] 执行定时库存同步...');
    try {
      const result = await syncInventory();
      console.log(`[Scheduler] 库存同步完成，影响 ${result.recordsAffected} 条记录`);
    } catch (err) {
      console.error('[Scheduler] 库存同步失败:', err.message);
    }
  });

  // 每 15 分钟同步一次订单
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] 执行定时订单同步...');
    try {
      const result = await syncOrders();
      console.log(`[Scheduler] 订单同步完成，影响 ${result.recordsAffected} 条记录`);
    } catch (err) {
      console.error('[Scheduler] 订单同步失败:', err.message);
    }
  });

  console.log('[Scheduler] 定时任务已启动：库存每小时，订单每15分钟');
}

module.exports = { startScheduler };
