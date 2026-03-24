# Role
You are a senior backend engineer continuing development on an existing project.

# Project Context
Amazon Seller Dashboard — self-hosted tool for a single Amazon US FBA seller.
Monorepo: server/ (Node.js + Express + Prisma) + client/ (React + Vite)
Backend port: 3002
Git remote: https://github.com/Ryan-Chiao/AmzTinyERP.git
Branch: main

Current state:
- Prisma schema v1.1 already exists at server/prisma/schema.prisma
- Mock data layer fully working: server/src/mock/data.js + services/mockService.js
- All routes exist: /api/inventory, /api/orders, /api/dashboard/stats, /api/sync/trigger
- USE_MOCK=true in .env (no real DB or SP-API yet)

# Task 1: Database Migration (P1-5) — DO THIS FIRST

## 1.1 Verify prerequisites
Check that server/prisma/schema.prisma exists and contains all models:
Product, InventorySnapshot, Order, OrderItem, SyncLog + all enums.
Do NOT modify the schema.

## 1.2 Run migration
Execute in server/:
  npx prisma migrate dev --name init
  npx prisma generate

## 1.3 Validate Prisma Client works
Start server with USE_MOCK=false temporarily.
Make these test calls and confirm no Prisma errors:
  GET http://localhost:3002/api/health
  GET http://localhost:3002/api/inventory
  GET http://localhost:3002/api/orders

Expected: routes return empty arrays (no data seeded yet), no crash, no
"PrismaClientInitializationError". If errors occur, fix them before proceeding.

## 1.4 Restore mock mode
Set USE_MOCK=true in .env after validation. All further development uses mock data.

---

# Task 2: Dashboard Chart Data API (P1-1)

## 2.1 Add mock data for chart

In server/src/mock/data.js, add and export a new constant:

export const mockChartData = {
  orderTrend: [
    // Last 7 days, most recent last
    // Generate realistic data: 2-8 orders per day, dates relative to today
    { date: "MM-DD", orders: N },  // 7 entries total
  ]
}

Use actual date strings for the last 7 days (e.g. if today is 03-24, use
03-18, 03-19, 03-20, 03-21, 03-22, 03-23, 03-24).

## 2.2 Add getChartData to mockService.js

Add this function to server/src/services/mockService.js:

getChartData()
  Returns: { orderTrend: [...] }

## 2.3 Add stub to spApiService.js

Add matching stub to server/src/services/spApiService.js:

getChartData()
  Throws: Error("SP-API not yet implemented")
  TODO comment: // TODO: aggregate from GET /orders/v0/orders (group by purchaseDate)

## 2.4 Add route to dashboard.js

In server/src/routes/dashboard.js, add:

GET /api/dashboard/chart-data
  Calls service.getChartData()
  Response: { data: { orderTrend: [...] } }

No new route file needed — add to existing dashboard.js.

---

# Task 3: API Verification (P1-2 / P1-3)

Test each endpoint below with curl or a REST client.
Fix any bugs found. Document what was tested and what (if anything) was fixed.

## Inventory endpoints
- GET /api/inventory
  Expected: { data: [...6 products], total: 6, lastSyncAt: string }

- GET /api/inventory?search=case
  Expected: filtered products where title/sku/asin contains "case"

- GET /api/inventory?lowStockOnly=true
  Expected: only products where fbaAvailable <= reorderThreshold

- GET /api/inventory/:asin
  Use a real ASIN from mock data.
  Expected: single product object or 404

## Order endpoints
- GET /api/orders
  Expected: { data: [...], total: 10, page: 1, pageSize: 20 }

- GET /api/orders?status=SHIPPED
  Expected: only SHIPPED orders

- GET /api/orders?page=1&pageSize=3
  Expected: first 3 orders, total still 10

- GET /api/orders/:amazonOrderId
  Use a real amazonOrderId from mock data.
  Expected: order object with nested orderItems array

## If any endpoint fails
Fix the bug in the route or service file. Add a comment:
// FIXED: [description of what was wrong]

---

# Task 4: Commit

Commit message: "feat(server): P1 DB migration + chart-data API + route verification"
Push to origin/main.

# Deliverables
1. Migration files exist in server/prisma/migrations/
2. GET /api/dashboard/chart-data returns 7-day order trend data
3. All inventory and order endpoints verified working
4. USE_MOCK=true restored in .env before commit