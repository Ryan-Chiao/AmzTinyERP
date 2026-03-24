# Amazon Seller Dashboard (AMZTinyERP)

Amazon FBA 卖家自托管运营工具，单账号自用。

## 技术栈

- **后端**：Node.js + Express + Prisma ORM
- **前端**：React + Vite + Ant Design
- **数据库**：PostgreSQL

## 前置条件

- Node.js 18+
- PostgreSQL 14+

## 启动步骤

1. `cd server && npm install`
2. 复制 `.env.example` 为 `.env`，填写 `DATABASE_URL`
3. `npm run db:migrate`
4. `npm run dev`

## 注意事项

- 设置 `USE_MOCK=true` 可在没有 SP-API 凭证的情况下运行
- Windows 用户请使用 PowerShell 或 Git Bash 执行 npm 脚本

## 目录结构

```
amazon-seller-dashboard/
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── mock/
│   │   │   └── index.js
│   │   └── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env.example
│   └── package.json
├── client/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── main.jsx
│   └── package.json
└── README.md
```
