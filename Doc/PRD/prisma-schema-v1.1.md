# Prisma Schema — v1.1 草稿

> v1.1 变更：新增 `parentAsin` 字段（预留变体支持）；`InventorySnapshot` 新增 `triggerType`；`SyncLog.message` 改为语义更清晰的 `errorMessage`；补充 `Product.price` 说明注释。

---

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── 商品（子 ASIN 级别，子 ASIN 与 SKU 1:1） ─────────
model Product {
  id                 String   @id @default(cuid())
  asin               String   @unique   // 子 ASIN，唯一
  sku                String   @unique   // 卖家 SKU，唯一
  parentAsin         String?            // 父 ASIN，单品 listing 为 null，预留变体分组
  title              String
  imageUrl           String?

  // 价格（当前快照价，仅存最新值；历史价格追踪属 Phase 2 定价模块）
  price              Decimal  @db.Decimal(10, 2)

  // FBA 库存
  fbaAvailable       Int      @default(0)   // 可售数量
  fbaInbound         Int      @default(0)   // 在途数量

  // 补货参数（用户可在界面调整）
  reorderThreshold   Int      @default(30)  // 低库存预警阈值
  leadTimeDays       Int      @default(30)  // 补货周期（天），头程约 30-45 天
  safetyBufferDays   Int      @default(7)   // 安全缓冲天数
  salesWindowDays    Int      @default(30)  // 日均销量计算窗口（天）

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  orderItems         OrderItem[]
  inventorySnapshots InventorySnapshot[]

  @@index([parentAsin])   // 按父 ASIN 分组查询（变体场景）
}

// ── 库存快照（用于历史趋势图）────────────────────────
model InventorySnapshot {
  id           String      @id @default(cuid())
  productId    String
  product      Product     @relation(fields: [productId], references: [id])
  fbaAvailable Int
  fbaInbound   Int
  triggerType  SyncTrigger // 记录快照来源（定时/手动/启动）
  recordedAt   DateTime    @default(now())

  @@index([productId, recordedAt])
}

// ── 订单 ──────────────────────────────────────────────
model Order {
  id              String      @id @default(cuid())
  amazonOrderId   String      @unique
  status          OrderStatus
  totalAmount     Decimal     @db.Decimal(10, 2)
  currency        String      @default("USD")
  purchaseDate    DateTime
  lastUpdateDate  DateTime

  // PII 合规：不存储任何买家信息（姓名、邮件、电话、地址）

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

// ── 订单明细 ──────────────────────────────────────────
model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id])
  productId String?            // 软关联，SP-API 返回时通过 asin 匹配
  product   Product? @relation(fields: [productId], references: [id])
  asin      String
  sku       String?
  title     String
  quantity  Int
  price     Decimal  @db.Decimal(10, 2)

  @@index([orderId])
  @@index([asin])
}

// ── 同步日志 ──────────────────────────────────────────
model SyncLog {
  id           String      @id @default(cuid())
  module       SyncModule
  triggerType  SyncTrigger
  status       SyncStatus
  errorMessage String?     // 错误或警告详情，成功时为 null
  recordCount  Int?        // 本次同步拉取的记录数
  durationMs   Int?        // 耗时（毫秒）
  createdAt    DateTime    @default(now())

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
```

---

## v1.1 变更说明

| 变更 | 原因 |
|------|------|
| `Product.parentAsin String?` | 预留父 ASIN 分组，当前单品时为 null，无破坏性变更 |
| `Product` 加 `@@index([parentAsin])` | 支持按变体分组查询 |
| `Product.price` 补注释 | 明确仅存当前快照价，避免误解 |
| `InventorySnapshot` 加 `triggerType` | 记录快照来源，与 SyncLog 对应 |
| `SyncLog.message` → `errorMessage` | 语义更清晰 |
