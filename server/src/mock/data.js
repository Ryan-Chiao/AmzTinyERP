// Mock data for Amazon Seller Dashboard
// Simulates realistic US FBA seller data — NO buyer PII

const now = new Date();
const daysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

// ── Products ─────────────────────────────────────────────────────────────────
// 2 single ASINs + 2 parent groups (2 variants each)
const products = [
  // Single ASIN — healthy stock
  {
    id: 'prod_001',
    asin: 'B08N5WRWNW',
    sku: 'SKU-HEADPHONE-BLK',
    parentAsin: null,
    title: 'Premium Wireless Noise-Cancelling Headphones - Black',
    imageUrl: 'https://via.placeholder.com/100',
    price: '89.99',
    fbaAvailable: 124,
    fbaInbound: 0,
    reorderThreshold: 30,
    leadTimeDays: 30,
    safetyBufferDays: 7,
    salesWindowDays: 30,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },
  // Single ASIN — out of stock
  {
    id: 'prod_002',
    asin: 'B09KXQF8RY',
    sku: 'SKU-CABLE-USB-C',
    parentAsin: null,
    title: '6ft USB-C to USB-C Braided Fast Charging Cable',
    imageUrl: 'https://via.placeholder.com/100',
    price: '14.99',
    fbaAvailable: 0,
    fbaInbound: 200,
    reorderThreshold: 30,
    leadTimeDays: 14,
    safetyBufferDays: 5,
    salesWindowDays: 30,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
  },
  // Parent group A — Yoga Mat (Color variants)
  {
    id: 'prod_003',
    asin: 'B07XQZLM3A',
    sku: 'SKU-YOGAMAT-PUR',
    parentAsin: 'B07XQZLM00',
    title: 'Extra Thick Yoga Mat 6mm - Purple',
    imageUrl: 'https://via.placeholder.com/100',
    price: '34.99',
    fbaAvailable: 18,   // LOW — below reorderThreshold
    fbaInbound: 60,
    reorderThreshold: 30,
    leadTimeDays: 45,
    safetyBufferDays: 7,
    salesWindowDays: 30,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(1),
  },
  {
    id: 'prod_004',
    asin: 'B07XQZLM3B',
    sku: 'SKU-YOGAMAT-BLU',
    parentAsin: 'B07XQZLM00',
    title: 'Extra Thick Yoga Mat 6mm - Blue',
    imageUrl: 'https://via.placeholder.com/100',
    price: '34.99',
    fbaAvailable: 55,
    fbaInbound: 0,
    reorderThreshold: 30,
    leadTimeDays: 45,
    safetyBufferDays: 7,
    salesWindowDays: 30,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(1),
  },
  // Parent group B — Phone Stand (Size variants)
  {
    id: 'prod_005',
    asin: 'B0BNMKX5QA',
    sku: 'SKU-STAND-SM',
    parentAsin: 'B0BNMKX500',
    title: 'Adjustable Aluminum Phone Stand - Small',
    imageUrl: 'https://via.placeholder.com/100',
    price: '19.99',
    fbaAvailable: 22,   // LOW — below reorderThreshold
    fbaInbound: 0,
    reorderThreshold: 30,
    leadTimeDays: 30,
    safetyBufferDays: 7,
    salesWindowDays: 30,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(3),
  },
  {
    id: 'prod_006',
    asin: 'B0BNMKX5QB',
    sku: 'SKU-STAND-LG',
    parentAsin: 'B0BNMKX500',
    title: 'Adjustable Aluminum Phone Stand - Large',
    imageUrl: 'https://via.placeholder.com/100',
    price: '24.99',
    fbaAvailable: 88,
    fbaInbound: 50,
    reorderThreshold: 30,
    leadTimeDays: 30,
    safetyBufferDays: 7,
    salesWindowDays: 30,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(1),
  },
];

// ── Orders ────────────────────────────────────────────────────────────────────
// 10 orders, mix of statuses, spread over last 30 days
const orders = [
  {
    id: 'order_001',
    amazonOrderId: '114-1234567-8901234',
    status: 'DELIVERED',
    totalAmount: '89.99',
    currency: 'USD',
    purchaseDate: daysAgo(28),
    lastUpdateDate: daysAgo(22),
    createdAt: daysAgo(28),
    updatedAt: daysAgo(22),
    orderItems: [
      { id: 'oi_001', orderId: 'order_001', productId: 'prod_001', asin: 'B08N5WRWNW', sku: 'SKU-HEADPHONE-BLK', title: 'Premium Wireless Noise-Cancelling Headphones - Black', quantity: 1, price: '89.99' },
    ],
  },
  {
    id: 'order_002',
    amazonOrderId: '114-2345678-9012345',
    status: 'DELIVERED',
    totalAmount: '69.98',
    currency: 'USD',
    purchaseDate: daysAgo(25),
    lastUpdateDate: daysAgo(19),
    createdAt: daysAgo(25),
    updatedAt: daysAgo(19),
    orderItems: [
      { id: 'oi_002', orderId: 'order_002', productId: 'prod_003', asin: 'B07XQZLM3A', sku: 'SKU-YOGAMAT-PUR', title: 'Extra Thick Yoga Mat 6mm - Purple', quantity: 2, price: '34.99' },
    ],
  },
  {
    id: 'order_003',
    amazonOrderId: '114-3456789-0123456',
    status: 'SHIPPED',
    totalAmount: '44.98',
    currency: 'USD',
    purchaseDate: daysAgo(10),
    lastUpdateDate: daysAgo(8),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(8),
    orderItems: [
      { id: 'oi_003', orderId: 'order_003', productId: 'prod_006', asin: 'B0BNMKX5QB', sku: 'SKU-STAND-LG', title: 'Adjustable Aluminum Phone Stand - Large', quantity: 1, price: '24.99' },
      { id: 'oi_004', orderId: 'order_003', productId: 'prod_002', asin: 'B09KXQF8RY', sku: 'SKU-CABLE-USB-C', title: '6ft USB-C to USB-C Braided Fast Charging Cable', quantity: 1, price: '14.99' },
    ],
  },
  {
    id: 'order_004',
    amazonOrderId: '114-4567890-1234567',
    status: 'SHIPPED',
    totalAmount: '34.99',
    currency: 'USD',
    purchaseDate: daysAgo(7),
    lastUpdateDate: daysAgo(5),
    createdAt: daysAgo(7),
    updatedAt: daysAgo(5),
    orderItems: [
      { id: 'oi_005', orderId: 'order_004', productId: 'prod_004', asin: 'B07XQZLM3B', sku: 'SKU-YOGAMAT-BLU', title: 'Extra Thick Yoga Mat 6mm - Blue', quantity: 1, price: '34.99' },
    ],
  },
  {
    id: 'order_005',
    amazonOrderId: '114-5678901-2345678',
    status: 'UNSHIPPED',
    totalAmount: '109.98',
    currency: 'USD',
    purchaseDate: daysAgo(3),
    lastUpdateDate: daysAgo(3),
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    orderItems: [
      { id: 'oi_006', orderId: 'order_005', productId: 'prod_001', asin: 'B08N5WRWNW', sku: 'SKU-HEADPHONE-BLK', title: 'Premium Wireless Noise-Cancelling Headphones - Black', quantity: 1, price: '89.99' },
      { id: 'oi_007', orderId: 'order_005', productId: 'prod_005', asin: 'B0BNMKX5QA', sku: 'SKU-STAND-SM', title: 'Adjustable Aluminum Phone Stand - Small', quantity: 1, price: '19.99' },
    ],
  },
  {
    id: 'order_006',
    amazonOrderId: '114-6789012-3456789',
    status: 'UNSHIPPED',
    totalAmount: '19.99',
    currency: 'USD',
    purchaseDate: daysAgo(2),
    lastUpdateDate: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
    orderItems: [
      { id: 'oi_008', orderId: 'order_006', productId: 'prod_005', asin: 'B0BNMKX5QA', sku: 'SKU-STAND-SM', title: 'Adjustable Aluminum Phone Stand - Small', quantity: 1, price: '19.99' },
    ],
  },
  {
    id: 'order_007',
    amazonOrderId: '114-7890123-4567890',
    status: 'PENDING',
    totalAmount: '89.99',
    currency: 'USD',
    purchaseDate: daysAgo(1),
    lastUpdateDate: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    orderItems: [
      { id: 'oi_009', orderId: 'order_007', productId: 'prod_001', asin: 'B08N5WRWNW', sku: 'SKU-HEADPHONE-BLK', title: 'Premium Wireless Noise-Cancelling Headphones - Black', quantity: 1, price: '89.99' },
    ],
  },
  {
    id: 'order_008',
    amazonOrderId: '114-8901234-5678901',
    status: 'PENDING',
    totalAmount: '14.99',
    currency: 'USD',
    purchaseDate: daysAgo(0),
    lastUpdateDate: daysAgo(0),
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    orderItems: [
      { id: 'oi_010', orderId: 'order_008', productId: 'prod_002', asin: 'B09KXQF8RY', sku: 'SKU-CABLE-USB-C', title: '6ft USB-C to USB-C Braided Fast Charging Cable', quantity: 1, price: '14.99' },
    ],
  },
  {
    id: 'order_009',
    amazonOrderId: '114-9012345-6789012',
    status: 'CANCELED',
    totalAmount: '34.99',
    currency: 'USD',
    purchaseDate: daysAgo(15),
    lastUpdateDate: daysAgo(14),
    createdAt: daysAgo(15),
    updatedAt: daysAgo(14),
    orderItems: [
      { id: 'oi_011', orderId: 'order_009', productId: 'prod_003', asin: 'B07XQZLM3A', sku: 'SKU-YOGAMAT-PUR', title: 'Extra Thick Yoga Mat 6mm - Purple', quantity: 1, price: '34.99' },
    ],
  },
  {
    id: 'order_010',
    amazonOrderId: '114-0123456-7890123',
    status: 'UNFULFILLABLE',
    totalAmount: '24.99',
    currency: 'USD',
    purchaseDate: daysAgo(20),
    lastUpdateDate: daysAgo(18),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(18),
    orderItems: [
      { id: 'oi_012', orderId: 'order_010', productId: 'prod_006', asin: 'B0BNMKX5QB', sku: 'SKU-STAND-LG', title: 'Adjustable Aluminum Phone Stand - Large', quantity: 1, price: '24.99' },
    ],
  },
];

// ── SyncLogs ──────────────────────────────────────────────────────────────────
const syncLogs = [
  {
    id: 'sync_001',
    module: 'INVENTORY',
    triggerType: 'SCHEDULED',
    status: 'SUCCESS',
    errorMessage: null,
    recordCount: 6,
    durationMs: 843,
    createdAt: daysAgo(0),
  },
  {
    id: 'sync_002',
    module: 'ORDERS',
    triggerType: 'SCHEDULED',
    status: 'SUCCESS',
    errorMessage: null,
    recordCount: 10,
    durationMs: 1254,
    createdAt: daysAgo(0),
  },
  {
    id: 'sync_003',
    module: 'INVENTORY',
    triggerType: 'MANUAL',
    status: 'WARNING',
    errorMessage: 'Rate limit reached: 3 ASINs skipped due to SP-API throttling (429). Will retry on next scheduled sync.',
    recordCount: 3,
    durationMs: 1987,
    createdAt: daysAgo(1),
  },
  {
    id: 'sync_004',
    module: 'ORDERS',
    triggerType: 'STARTUP',
    status: 'FAILURE',
    errorMessage: 'SP-API authentication failed: refresh token expired. Please re-authorize in settings.',
    recordCount: 0,
    durationMs: 312,
    createdAt: daysAgo(3),
  },
  {
    id: 'sync_005',
    module: 'INVENTORY',
    triggerType: 'SCHEDULED',
    status: 'SUCCESS',
    errorMessage: null,
    recordCount: 6,
    durationMs: 671,
    createdAt: daysAgo(1),
  },
];

// ── Chart Data ────────────────────────────────────────────────────────────────
// Last 7 days order trend (most recent last)
const fmtDate = (d) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
};

const mockChartData = {
  orderTrend: Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return { date: fmtDate(d), orders: [3, 5, 2, 7, 4, 6, 8][i] };
  }),
};

module.exports = { products, orders, syncLogs, mockChartData };
