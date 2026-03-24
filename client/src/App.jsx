import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Typography, Empty } from 'antd';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';

function ComingSoon({ title }) {
  return (
    <div>
      <Typography.Title level={4}>{title}</Typography.Title>
      <Empty description="即将上线，敬请期待" style={{ marginTop: 80 }} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/pricing" element={<ComingSoon title="定价补货" />} />
          <Route path="/ads" element={<ComingSoon title="广告数据" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
