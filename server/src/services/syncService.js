/**
 * syncService.js — 数据同步服务
 * 负责从 SP-API 拉取数据并写入数据库（Prisma）
 * Phase 2：修复 InventorySnapshot productId / SyncLog FAILURE / OrderItem upsert
 */

const { PrismaClient } = require('@prisma/client');
const spApi = require('./spApiService');

const prisma = new PrismaClient();

// ─── 库存同步 ─────────────────────────────────────────────

/**
 * 从 SP-API 拉取 FBA 库存，upsert Product + InventorySnapshot，写 SyncLog
 * @param {{ triggerType?: 'SCHEDULED'|'MANUAL'|'STARTUP' }} opts
 * @returns {{ recordsAffected: number }}
 */
async function syncInventory(opts = {}) {
  const triggerType = opts.triggerType || 'SCHEDULED';
  const startedAt = Date.now();
  let recordsAffected = 0;

  try {
    const items = await spApi.getInventory();

    for (const item of items) {
      const asin = item.asin;
      const sku = item.sellerSku;
      const fbaAvailable = item.inventoryDetails?.fulfillableQuantity ?? 0;
      const fbaInbound =
        (item.inventoryDetails?.inboundWorkingQuantity ?? 0) +
        (item.inventoryDetails?.inboundShippedQuantity ?? 0);

      // Upsert Product（只更新库存相关字段，不覆盖补货参数）
      const product = await prisma.product.upsert({
        where: { asin },
        create: {
          asin,
          sku,
          title: item.productName || sku,
          price: 0,
          fbaAvailable,
          fbaInbound,
        },
        update: {
          fbaAvailable,
          fbaInbound,
          updatedAt: new Date(),
        },
      });

      // FIX: 用 product.id 写 InventorySnapshot，并补充 triggerType 字段
      await prisma.inventorySnapshot.create({
        data: {
          productId: product.id,
          fbaAvailable,
          fbaInbound,
          triggerType,
          recordedAt: new Date(),
        },
      });

      recordsAffected++;
    }

    await writeSyncLog({ module: 'INVENTORY', status: 'SUCCESS', triggerType, recordsAffected, startedAt });
    return { recordsAffected };
  } catch (err) {
    // FIX: 'FAILED' → 'FAILURE'
    await writeSyncLog({ module: 'INVENTORY', status: 'FAILURE', triggerType, error: err.message, startedAt });
    throw err;
  }
}

// ─── 订单同步 ─────────────────────────────────────────────

/**
 * 从 SP-API 拉取订单（增量），upsert Order + OrderItem，写 SyncLog
 * ⚠️ 买家 PII（BuyerInfo）在此处丢弃，不入库
 * @param {{ dateFrom?: string, triggerType?: string }} options
 * @returns {{ recordsAffected: number }}
 */
async function syncOrders(options = {}) {
  const triggerType = options.triggerType || 'SCHEDULED';
  const startedAt = Date.now();
  let recordsAffected = 0;

  try {
    const rawOrders = await spApi.getOrders({ dateFrom: options.dateFrom });

    for (const raw of rawOrders) {
      const amazonOrderId = raw.AmazonOrderId;

      const statusMap = {
        Pending: 'PENDING',
        Unshipped: 'UNSHIPPED',
        PartiallyShipped: 'UNSHIPPED',
        Shipped: 'SHIPPED',
        Canceled: 'CANCELED',
        Unfulfillable: 'UNFULFILLABLE',
      };
      const status = statusMap[raw.OrderStatus] || 'PENDING';

      const totalAmount = parseFloat(
        raw.OrderTotal?.Amount || raw.PaymentTotal?.Amount || '0'
      );
      const currency = raw.OrderTotal?.CurrencyCode || 'USD';

      // Upsert Order（无 PII），返回 DB 内的 id
      const dbOrder = await prisma.order.upsert({
        where: { amazonOrderId },
        create: {
          amazonOrderId,
          status,
          totalAmount,
          currency,
          purchaseDate: new Date(raw.PurchaseDate),
          lastUpdateDate: new Date(raw.LastUpdateDate),
        },
        update: {
          status,
          totalAmount,
          currency,
          lastUpdateDate: new Date(raw.LastUpdateDate),
        },
      });

      // FIX: OrderItem upsert 改为 findFirst + create/update，不依赖不存在的复合 unique
      try {
        const rawItems = await spApi.getOrderItems(amazonOrderId);
        for (const ri of rawItems) {
          const existing = await prisma.orderItem.findFirst({
            where: { orderId: dbOrder.id, asin: ri.ASIN },
          });

          const itemData = {
            quantity: ri.QuantityOrdered,
            price: parseFloat(ri.ItemPrice?.Amount || '0'),
          };

          if (existing) {
            await prisma.orderItem.update({
              where: { id: existing.id },
              data: itemData,
            });
          } else {
            await prisma.orderItem.create({
              data: {
                orderId: dbOrder.id,
                asin: ri.ASIN,
                sku: ri.SellerSKU,
                title: ri.Title || ri.ASIN,
                ...itemData,
              },
            });
          }
        }
      } catch (itemErr) {
        console.warn(`[SyncOrders] getOrderItems failed for ${amazonOrderId}: ${itemErr.message}`);
      }

      recordsAffected++;
    }

    await writeSyncLog({ module: 'ORDERS', status: 'SUCCESS', triggerType, recordsAffected, startedAt });
    return { recordsAffected };
  } catch (err) {
    // FIX: 'FAILED' → 'FAILURE'
    await writeSyncLog({ module: 'ORDERS', status: 'FAILURE', triggerType, error: err.message, startedAt });
    throw err;
  }
}

// ─── 全量同步 ─────────────────────────────────────────────

async function syncAll(opts = {}) {
  const [inv, ord] = await Promise.allSettled([
    syncInventory(opts),
    syncOrders(opts),
  ]);
  return {
    inventory: inv.status === 'fulfilled' ? inv.value : { error: inv.reason?.message },
    orders: ord.status === 'fulfilled' ? ord.value : { error: ord.reason?.message },
  };
}

// ─── 工具函数 ─────────────────────────────────────────────

async function writeSyncLog({ module, status, triggerType = 'SCHEDULED', recordsAffected = 0, error = null, startedAt }) {
  try {
    await prisma.syncLog.create({
      data: {
        module,
        triggerType,
        status,
        recordCount: recordsAffected,
        errorMessage: error,
        durationMs: Date.now() - startedAt,
      },
    });
  } catch (e) {
    console.error('[SyncLog] 写入失败:', e.message);
  }
}

module.exports = { syncInventory, syncOrders, syncAll };
