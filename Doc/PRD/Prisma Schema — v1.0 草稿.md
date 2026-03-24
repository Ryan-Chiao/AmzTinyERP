// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── 商品 ──────────────────────────────────────────
model Product {
  id                 String   @id @default(cuid())
  asin               String   @unique
  sku                String   @unique
  title              String
  imageUrl           String?

  // 价格
  price              Decimal  @db.Decimal(10, 2)

  // FBA 库存
  fbaAvailable       Int      @default(0)   // 可售数量
  fbaInbound         Int      @default(0)   // 在途数量

  // 补货参数
  reorderThreshold   Int      @default(30)  // 低库存预警阈值
  leadTimeDays       Int      @default(30)  // 补货周期（天）
  safetyBufferDays   Int      @default(7)   // 安全缓冲（天）
  salesWindowDays    Int      @default(30)  // 日均销量计算窗口（可配置，默认30天）

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  orderItems         OrderItem[]
  inventorySnapshots InventorySnapshot[]
}

// ── 库存快照（用于历史趋势图）────────────────────
model InventorySnapshot {
  id           String   @id @default(cuid())
  productId    String
  product      Product  @relation(fields: [productId], references: [id])
  fbaAvailable Int
  fbaInbound   Int
  recordedAt   DateTime @default(now())

  @@index([productId, recordedAt])
}

// ── 订单 ──────────────────────────────────────────
model Order {
  id              String      @id @default(cuid())
  amazonOrderId   String      @unique
  status          OrderStatus
  totalAmount     Decimal     @db.Decimal(10, 2)
  currency        String      @default("USD")
  purchaseDate    DateTime
  lastUpdateDate  DateTime

  // PII 合规：不存储任何买家信息

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  orderItems      OrderItem[]
}

enum OrderStatus {
  PENDING
  UNSHIPPED
  SHIPPED
  DELIVERED
  CANCELED
  UNFULFILLABLE
}

// ── 订单明细 ──────────────────────────────────────
model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id])
  productId String?
  product   Product? @relation(fields: [productId], references: [id])
  asin      String
  sku       String?
  title     String
  quantity  Int
  price     Decimal  @db.Decimal(10, 2)

  @@index([orderId])
  @@index([asin])
}

// ── 同步日志 ──────────────────────────────────────
model SyncLog {
  id          String      @id @default(cuid())
  module      SyncModule  // 哪个模块触发的同步
  triggerType SyncTrigger // 触发方式
  status      SyncStatus
  message     String?     // 错误信息或警告详情
  recordCount Int?        // 本次同步拉取的记录数
  durationMs  Int?        // 耗时（毫秒）
  createdAt   DateTime    @default(now())

  @@index([module, createdAt])
  @@index([status, createdAt])
}

enum SyncModule {
  INVENTORY
  ORDERS
  PRICING
  ADVERTISING
}

enum SyncTrigger {
  SCHEDULED   // 定时任务
  MANUAL      // 手动触发
  STARTUP     // 应用启动时
}

enum SyncStatus {
  SUCCESS
  WARNING     // 部分成功（如 rate limit 导致部分数据未拉取）
  FAILURE
}