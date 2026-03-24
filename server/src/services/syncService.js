/**
 * syncService.js — 数据同步服务
 * 负责从 SP-API 拉取数据并写入数据库（Prisma）
 * Phase 2
 */

const { PrismaClient } = require('@prisma/client');
const spApi = require('./spApiService');

const prisma = new PrismaClient();

// ─── 库存同步 ─────────────────────────────────────────────

/**
 * 从 SP-API 拉取 FBA 库存，upsert Product + InventorySnapshot，写 SyncLog
 * @returns {{ recordsAffected: number }}
 */
async function syncInventory() {
  const startedAt = Date.now();
  let recordsAffected = 0;

  try {
    const items = await spApi.getInventory();

    for (const item of items) {
      // SP-API FBA Inventory Summary 字段映射
      const asin = item.asin;
      const sku = item.sellerSku;
      const fbaAvailable = item.inventoryDetails?.fulfillableQuantity ?? 0;
      const fbaInbound =
        (item.inventoryDetails?.inboundWorkingQuantity ?? 0) +
        (item.inventoryDetails?.inboundShippedQuantity ?? 0);

      // Upsert Product（只更新库存相关字段，不覆盖补货参数）
      await prisma.product.upsert({
        where: { asin },
        create: {
          asin,
          sku,
          title: item.productName || sku,
          fbaAvailable,
          fbaInbound,
        },
        update: {
          fbaAvailable,
          fbaInbound,
          updatedAt: new Date(),
        },
      });

      // 写 InventorySnapshot
      await prisma.inventorySnapshot.create({
        data: {
          productAsin: asin,
          fbaAvailable,
          fbaInbound,
          snapshotAt: new Date(),
        },
      });

      recordsAffected++;
    }

    await writeSyncLog({ module: 'INVENTORY', status: 'SUCCESS', recordsAffected, startedAt });
    return { recordsAffected };
  } catch (err) {
    await writeSyncLog({ module: 'INVENTORY', status: 'FAILED', error: err.message, startedAt });
    throw err;
  }
}

// ─── 订单同步 ─────────────────────────────────────────────

/**
 * 从 SP-API 拉取订单（默认近 30 天），upsert Order + OrderItem，写 SyncLog
 * ⚠️ 买家 PII（BuyerInfo）在此处丢弃，不入库
 * @param {{ dateFrom?: string }} options
 * @returns {{ recordsAffected: number }}
 */
async function syncOrders(options = {}) {
  const startedAt = Date.now();
  let recordsAffected = 0;

  try {
    const rawOrders = await spApi.getOrders({ dateFrom: options.dateFrom });

    for (const raw of rawOrders) {
      const amazonOrderId = raw.AmazonOrderId;

      // 状态映射（SP-API → 本地枚举）
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

      // Upsert Order（无 PII）
      await prisma.order.upsert({
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

      // 拉取并 upsert OrderItem
      try {
        const rawItems = await spApi.getOrderItems(amazonOrderId);
        for (const ri of rawItems) {
          await prisma.orderItem.upsert({
            where: {
              orderId_asin: {
                orderId: amazonOrderId,
                asin: ri.ASIN,
              },
            },
            create: {
              orderId: amazonOrderId,
              asin: ri.ASIN,
              sellerSku: ri.SellerSKU,
              title: ri.Title,
              quantity: ri.QuantityOrdered,
              unitPrice: parseFloat(ri.ItemPrice?.Amount || '0'),
            },
            update: {
              quantity: ri.QuantityOrdered,
              unitPrice: parseFloat(ri.ItemPrice?.Amount || '0'),
            },
          });
        }
      } catch (itemErr) {
        // 单个订单 Item 失败不中断整体同步
        console.warn(`[SyncOrders] getOrderItems failed for ${amazonOrderId}: ${itemErr.message}`);
      }

      recordsAffected++;
    }

    await writeSyncLog({ module: 'ORDERS', status: 'SUCCESS', recordsAffected, startedAt });
    return { recordsAffected };
  } catch (err) {
    await writeSyncLog({ module: 'ORDERS', status: 'FAILED', error: err.message, startedAt });
    throw err;
  }
}

// ─── 全量同步 ─────────────────────────────────────────────

async function syncAll() {
  const [inv, ord] = await Promise.allSettled([syncInventory(), syncOrders()]);
  return {
    inventory: inv.status === 'fulfilled' ? inv.value : { error: inv.reason?.message },
    orders: ord.status === 'fulfilled' ? ord.value : { error: ord.reason?.message },
  };
}

// ─── 工具函数 ─────────────────────────────────────────────

async function writeSyncLog({ module, status, recordsAffected = 0, error = null, startedAt }) {
  try {
    await prisma.syncLog.create({
      data: {
        module,
        triggerType: 'MANUAL',
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
