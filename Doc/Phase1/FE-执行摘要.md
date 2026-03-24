# Phase 1 前端执行摘要

> 执行时间：2026-03-24 | 执行角色：前端工程师

---

## 完成任务

### Task 1 — 环境变量配置 (P1-4)

| 文件 | 说明 |
|------|------|
| `client/.env` | `VITE_API_BASE_URL=http://localhost:3002`（本地运行，不入 Git） |
| `client/.env.example` | 同上，作为模板入 Git |
| `client/src/api/client.js` | baseURL 从硬编码改为 `import.meta.env.VITE_API_BASE_URL + '/api'` |

`.gitignore` 已有全局 `.env` 规则，无需额外修改。

---

### Task 2 — 库存管理页 (P1-2)

**文件**：`client/src/pages/Inventory.jsx`（全量替换）

| 功能 | 实现 |
|------|------|
| Table 6列 | 商品名称（缩略图）/ SKU / ASIN / 可售数量 / 在途数量 / 预警阈值 |
| 低库存高亮 | 行 class `low-stock-row`（红底）+ 可售数量红色粗体 |
| 搜索 | 受控 Input，防抖 300ms，清空自动重置 |
| 低库存过滤 | Ant Design Switch，联动 `lowStockOnly` 参数 |
| 产品详情 Drawer | 宽 480px，三节：基本信息 / 库存状态 / 补货参数，含 ASIN/SKU 可复制 |
| 错误状态 | Alert + 重试按钮 |

---

### Task 3 — 订单管理页 (P1-3)

**文件**：`client/src/pages/Orders.jsx`（全量替换）

| 功能 | 实现 |
|------|------|
| Table 6列 | 订单号（可复制）/ 状态Tag / 金额 / 货币 / 下单时间 / 最后更新 |
| 状态 Tag | 6种颜色映射；UNFULFILLABLE 带 WarningOutlined 图标 |
| 异常行高亮 | CANCELED / UNFULFILLABLE 行 class `abnormal-order-row`（红底） |
| 状态过滤 | Select，allowClear |
| 日期过滤 | RangePicker，转 ISO 字符串传参 |
| 服务端分页 | `page / pageSize=20 / total` 联动 |
| 订单详情 Drawer | 宽 520px，订单信息 + 商品明细 Table；**无 PII、无物流号** |
| 错误状态 | Alert + 重试按钮 |

---

### Task 4 — Dashboard 图表 (P1-1)

**新增依赖**：`@ant-design/plots`（88 packages, 14s）

| 文件 | 变更 |
|------|------|
| `client/src/api/index.js` | 新增 `getChartData() → GET /dashboard/chart-data` |
| `client/src/pages/Dashboard.jsx` | 替换两张占位卡片 |

| 图表 | 类型 | 数据源 |
|------|------|--------|
| 近7天订单趋势 | Line（@ant-design/plots） | `getChartData().orderTrend` |
| 库存状态分布 | Pie Donut（innerRadius=0.6） | `getDashboardStats()` 计算 |

两图均含：Spin 加载态 / Empty 无数据态。

---

### 版本管理

- 构建验证：`✓ 4837 modules transformed, built in 11.08s`
- 提交：`feat(client): P1 库存管理页 + 订单管理页 + Dashboard图表 + env配置`
- 已推送至 `origin/main`

---

## 关键设计决策

- **数据结构兼容**：API 响应 `res.data / res.orders / res` 三层兜底，兼容后端不同返回格式
- **无 PII 原则**：订单 Drawer 严格排除买家姓名、邮件、地址、电话、物流单号
- **图表降级**：后端 `/dashboard/chart-data` 若未实现，图表静默显示 Empty 而不报错
- **防抖隔离**：搜索防抖通过 `useRef` 管理 timer，不污染 React 状态

---

## 下一步（Phase 2 建议）

- SP-API 真实集成（替换 `spApiService.js` 存根）
- 库存补货建议模块（`/pricing` 路由）
- 广告数据展示（`/ads` 路由）
- 前端错误边界（全局 `<ErrorBoundary>`）
- 表格导出（CSV / Excel）
