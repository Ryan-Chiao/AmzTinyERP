v1.0 · 2026年3月 · 自用工具 · 美国站
## 1. 项目概述

### 1.1 背景与目标

本工具面向美国亚马逊 FBA 卖家自用，通过对接 Amazon SP-API 实现库存、订单、定价及广告数据的统一管理，替代手动登录 Seller Central 查看数据的低效方式。

**核心目标：**

- 减少信息分散，一个界面看清运营全貌
- 库存预警，减少 FBA 断货损失
- 订单追踪，快速定位异常
- 定价与广告数据可视化，辅助决策

### 1.2 产品范围

| 维度        | 内容                         |
| --------- | -------------------------- |
| 目标用户      | 自用（单一卖家账号）                 |
| 目标市场      | Amazon 美国站（US Marketplace） |
| 发货模式      | FBA 为主，兼容 FBM              |
| 访问方式      | 本地 Web 应用，浏览器访问            |
| SP-API 状态 | 注册进行中                      |

### 1.3 不在范围内（Out of Scope）

- 多店铺管理（Phase 3 再议）
- 对外 SaaS 化（Phase 3 再议）
- 自动下单补货（只做建议，不自动执行）
- 自动改价（只做建议，不自动执行）

---

## 2. 技术架构

### 2.1 技术栈

| 层级   | 技术选型                             | 备注             |
| ---- | -------------------------------- | -------------- |
| 前端   | React + Vite + Ant Design        | 表格/图表组件完善      |
| 后端   | Node.js + Express                | SP-API SDK 成熟  |
| 数据库  | PostgreSQL + Prisma ORM          | 关系型，查询灵活       |
| API  | Amazon SP-API                    | 官方唯一正规接口       |
| 部署   | 本地运行 / Docker                    | 自用，简单够用        |
| 开发环境 | Windows + Google Antigravity IDE | 备用 Claude Code |

### 2.2 系统架构

```
[Amazon SP-API]
      ↓ OAuth Token
[Node.js 后端]
  ├── 数据同步任务（定时拉取）
  ├── REST API（/api/inventory, /api/orders...）
  └── PostgreSQL（本地持久化）
      ↓
[React 前端]
  ├── Dashboard 总览
  ├── 库存管理页
  ├── 订单管理页
  ├── 定价/补货页（Phase 2）
  └── 广告数据页（Phase 2）
```

### 2.3 SP-API 关键信息

```
Marketplace ID（美国）：ATVPDKIKX0DER
所需 API 权限：
  - Inventory（FBA 库存）
  - Orders（订单）
  - Catalog Items（商品信息）
  - Pricing（定价，Phase 2）
  - Advertising（广告，Phase 2，独立 API）
```

---

## 3. 功能模块详细需求

### 3.1 Phase 1 — 库存管理

**目标：** 实时掌握 FBA 库存状态，提前预警断货风险。

#### 功能列表

|功能|优先级|说明|
|---|---|---|
|FBA 库存列表|P0|展示所有 SKU 的可售数量、在途数量|
|低库存预警|P0|可自定义阈值，低于阈值标红提示|
|库存历史趋势|P1|折线图展示近 30/60/90 天库存变化|
|补货建议|P1|基于销售速度估算建议补货时间和数量|
|商品基础信息|P1|ASIN、SKU、标题、主图、价格|

#### 数据字段

```
Product 表
- id, asin, sku, title, image_url
- price, fba_available, fba_inbound
- reorder_threshold（自定义预警值）
- created_at, updated_at
```

#### 预警逻辑

```
当 fba_available ≤ reorder_threshold 时：
- 列表行标红
- Dashboard 显示预警数量
- （Phase 2）支持邮件通知
```

---

### 3.2 Phase 1 — 订单管理

**目标：** 快速查看订单状态，定位异常订单。

#### 功能列表

|功能|优先级|说明|
|---|---|---|
|订单列表|P0|展示订单号、状态、金额、下单时间|
|订单筛选|P0|按状态、日期范围、ASIN 筛选|
|订单详情|P0|商品明细、买家信息（脱敏）、物流状态|
|收入统计|P1|今日/本周/本月销售额汇总|
|退款/取消订单追踪|P1|单独列出需关注的异常订单|

#### 订单状态映射

|SP-API 状态|界面显示|
|---|---|
|Pending|待处理|
|Unshipped|待发货|
|Shipped|已发货|
|Delivered|已送达|
|Canceled|已取消|
|Unfulfillable|异常|

#### 数据字段

```
Order 表
- id, amazon_order_id, status
- total_amount, currency
- purchase_date, last_update_date
- buyer_email（脱敏存储）

OrderItem 表
- id, order_id, asin, sku
- title, quantity, price
```

---

### 3.3 Phase 2 — 定价 / 补货

**目标：** 监控竞品价格，制定动态定价规则，生成补货计划。

#### 功能列表

|功能|优先级|说明|
|---|---|---|
|当前价格总览|P0|展示自己 listing 的现价、Buy Box 状态|
|竞品价格监控|P1|拉取同 ASIN 其他卖家报价|
|定价规则设置|P1|设置最低价/最高价保护范围|
|补货计划|P1|基于日均销量 × 补货周期生成建议|
|价格变更记录|P2|历史改价日志|

> ⚠️ 注意：定价模块只生成建议，不自动提交改价至亚马逊。

---

### 3.4 Phase 2 — 广告数据

**目标：** 汇总广告表现，快速判断投放效率。

> ⚠️ 广告数据使用独立的 Amazon Advertising API，需单独授权。

#### 功能列表

|功能|优先级|说明|
|---|---|---|
|广告总览|P0|花费、销售额、ACOS、ROAS 汇总|
|Campaign 列表|P0|各广告活动的核心指标|
|关键词报表|P1|关键词维度的展示量/点击/转化|
|预算追踪|P1|当日/本月广告预算消耗进度|
|趋势图|P2|ACOS 近期趋势折线图|

---

## 4. 非功能需求

|类别|要求|
|---|---|
|数据同步频率|库存/订单：每小时自动拉取一次|
|响应速度|页面加载 < 2秒（本地数据库查询）|
|安全性|SP-API Token 存储于 .env，不提交 git|
|数据保留|本地 PostgreSQL，保留 12 个月历史数据|
|错误处理|API 失败时显示上次同步时间，不白屏|

---

## 5. 开发阶段规划

### Phase 0（当前，1-2 周）

- [ ]  项目脚手架搭建（前端 + 后端 + 数据库）
- [ ]  SP-API 开发者账号注册完成
- [ ]  OAuth 授权流程打通，能拿到 Access Token
- [ ]  数据库基础表结构建立

### Phase 1（2-4 周）

- [ ]  库存管理模块（列表 + 预警）
- [ ]  订单管理模块（列表 + 详情 + 统计）
- [ ]  Dashboard 总览页
- [ ]  数据定时同步任务

### Phase 2（Phase 1 稳定后）

- [ ]  定价/补货模块
- [ ]  广告数据模块（需单独 Advertising API 授权）

### Phase 3（按需）

- [ ]  多店铺支持
- [ ]  移动端适配
- [ ]  通知提醒（邮件/webhook）

---

## 6. 待确认问题（Open Questions）

| #   | 问题                            | 影响模块         |
| --- | ----------------------------- | ------------ |
| Q1  | SP-API 注册预计何时完成？              | Phase 0 解锁时间 |
| Q2  | 补货建议的计算周期用几天销售数据？             | 库存模块         |
| Q3  | 广告 API 是否同步申请，还是 Phase 2 再处理？ | 广告模块         |
| Q4  | 是否需要多币种支持（CAD/MXN）？           | 订单模块         |