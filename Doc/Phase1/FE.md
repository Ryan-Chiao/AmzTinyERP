# Role
You are a senior frontend engineer continuing development on an existing React project.

# Project Context
Amazon Seller Dashboard — monorepo project.
Frontend: client/ (React 18 + Vite + Ant Design + Axios)
Backend: http://localhost:3002 (already running with mock data)
Git remote: https://github.com/Ryan-Chiao/AmzTinyERP.git
Branch: main

Current state of client/src/:
- api/client.js: Axios instance with hardcoded baseURL "http://localhost:3002/api"
- api/index.js: getDashboardStats, getInventory, getInventoryItem,
                getOrders, getOrderDetail, triggerSync
- layouts/MainLayout.jsx: collapsible sidebar, 5 nav items (2 disabled)
- pages/Dashboard.jsx: 5 stat cards + 2 placeholder chart areas + manual refresh
- pages/Inventory.jsx: placeholder (Ant Design Empty)
- pages/Orders.jsx: placeholder (Ant Design Empty)
- App.jsx: React Router with 5 routes wrapped in MainLayout

# Task 1: Environment Config (P1-4) — DO THIS FIRST

## 1.1 Create client/.env
Content:
  VITE_API_BASE_URL=http://localhost:3002

## 1.2 Create client/.env.example
Content:
  VITE_API_BASE_URL=http://localhost:3002

## 1.3 Update client/src/api/client.js
Replace hardcoded baseURL with:
  baseURL: import.meta.env.VITE_API_BASE_URL + '/api'

Add client/.env to .gitignore if not already there.
Add client/.env.example to git.

---

# Task 2: Inventory Page (P1-2)

Replace client/src/pages/Inventory.jsx entirely.

## Layout
- Page title: "库存管理"
- Toolbar row: search input (left) + "仅显示低库存" Switch (right)
- Ant Design Table below toolbar
- Ant Design Drawer for product detail (opens on row click)

## Table columns
| Column | dataIndex | Notes |
|--------|-----------|-------|
| 商品名称 | title | Show imageUrl thumbnail (32x32) before text if imageUrl exists |
| SKU | sku | monospace font |
| ASIN | asin | monospace font |
| 可售数量 | fbaAvailable | Red bold text if fbaAvailable <= reorderThreshold |
| 在途数量 | fbaInbound | Normal text |
| 预警阈值 | reorderThreshold | Normal text |

## Row styling
Row with fbaAvailable <= reorderThreshold gets className "low-stock-row".
Add CSS: .low-stock-row td { background-color: #fff2f0 !important; }

## Search behavior
- Controlled input, debounce 300ms
- On change: call getInventory({ search: value })
- On clear: call getInventory({})

## Low stock switch
- Ant Design Switch with label "仅显示低库存"
- On toggle: call getInventory({ lowStockOnly: true/false })

## Loading + error states
- Table shows Ant Design skeleton/spin while loading
- On error: Ant Design Alert with retry button

## Product detail Drawer
- Opens on row click
- Width: 480px
- Title: product title
- Content sections:
  Section "基本信息":
    - ASIN (copyable)
    - SKU (copyable)
    - 父 ASIN (show "—" if null)
    - 当前价格 (prefix "$")
    - 主图 (if imageUrl: show 120x120 image; else: show "暂无图片")

  Section "库存状态":
    - 可售数量 (red if low stock)
    - 在途数量
    - 预警阈值

  Section "补货参数":
    - 补货周期 (leadTimeDays, suffix "天")
    - 安全缓冲 (safetyBufferDays, suffix "天")
    - 销量计算窗口 (salesWindowDays, suffix "天")

- Close button in Drawer footer

## Data fetching
On mount: call getInventory({})
After search/filter change: refetch with new params

---

# Task 3: Orders Page (P1-3)

Replace client/src/pages/Orders.jsx entirely.

## Layout
- Page title: "订单管理"
- Filter row: status Select (left) + date range DatePicker (middle) + clear button (right)
- Ant Design Table below filters
- Ant Design Drawer for order detail (opens on row click)

## Table columns
| Column | dataIndex | Notes |
|--------|-----------|-------|
| 订单号 | amazonOrderId | monospace, copyable |
| 状态 | status | Ant Design Tag, see color mapping below |
| 金额 | totalAmount | prefix "$", right-aligned |
| 货币 | currency | small gray text |
| 下单时间 | purchaseDate | format "YYYY-MM-DD HH:mm" using dayjs |
| 最后更新 | lastUpdateDate | format "YYYY-MM-DD HH:mm" using dayjs |

## Status tag color mapping
PENDING → blue
UNSHIPPED → orange
SHIPPED → cyan
DELIVERED → green
CANCELED → red
UNFULFILLABLE → red (with warning icon)

## Row styling
CANCELED and UNFULFILLABLE rows get className "abnormal-order-row".
Add CSS: .abnormal-order-row td { background-color: #fff2f0 !important; }

## Filter behavior
- Status Select: placeholder "全部状态", allow clear
  On change: call getOrders({ status: value, page: 1 })
- DatePicker.RangePicker: on change call
  getOrders({ dateFrom: start.toISOString(), dateTo: end.toISOString(), page: 1 })
- Clear button: reset all filters, call getOrders({ page: 1 })

## Pagination
Use server-side pagination:
  pagination={{ current: page, pageSize, total, onChange: (p) => setPage(p) }}
On page change: call getOrders({ ...currentFilters, page: p })

## Order detail Drawer
- Opens on row click (call getOrderDetail(amazonOrderId))
- Width: 520px
- Title: "订单详情"
- Show loading spinner while fetching detail

Content:
  Section "订单信息":
    - 订单号 (copyable)
    - 状态 (Tag, same color mapping)
    - 总金额 (prefix "$")
    - 下单时间
    - 最后更新时间

  Section "商品明细" (Ant Design Table, no pagination):
    Columns: 商品名称 | ASIN | SKU | 数量 | 单价
    Data: order.orderItems array

  ⚠️ Do NOT show any buyer information (no name, email, address, phone)
  ⚠️ Do NOT show tracking number (not yet in schema)

- Close button in Drawer footer

## Data fetching
On mount: call getOrders({ page: 1, pageSize: 20 })

---

# Task 4: Dashboard Charts (P1-1)
# Only start this task after backend agent has added GET /api/dashboard/chart-data

## 4.1 Install chart library
Run: npm install @ant-design/plots

## 4.2 Add getChartData to client/src/api/index.js
getChartData() → GET /dashboard/chart-data
Returns: { data: { orderTrend: [...] } }

## 4.3 Update Dashboard.jsx
Replace the two placeholder chart cards with real charts.

Chart 1 — 近7天订单趋势 (Line chart):
  Data source: getChartData() → data.orderTrend
  X axis: date field
  Y axis: orders field
  Use @ant-design/plots Line component
  Show loading skeleton while fetching

Chart 2 — 库存状态分布 (Pie/Donut chart):
  Data source: getDashboardStats() (already fetched)
  Data: [
    { type: "正常库存", value: totalSkus - lowStockCount },
    { type: "低库存预警", value: lowStockCount }
  ]
  Use @ant-design/plots Pie component with innerRadius for donut style
  Color: normal = #52c41a, low stock = #ff4d4f

Both charts:
  - Show Ant Design Spin while loading
  - Show empty state if no data
  - Responsive width (fill card width)

---

# Task 5: Commit

Commit message: "feat(client): P1 库存管理页 + 订单管理页 + Dashboard图表 + env配置"
Push to origin/main.

# Deliverables
1. client/.env and client/.env.example created
2. api/client.js reads baseURL from env
3. Inventory page: table with low-stock highlight, search, filter, detail Drawer
4. Orders page: table with status tags, filters, pagination, detail Drawer (no PII)
5. Dashboard: line chart + donut chart replace placeholders
6. npm run dev starts without errors