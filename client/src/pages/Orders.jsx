import React from 'react';
import { Typography, Empty } from 'antd';

const { Title } = Typography;

export default function Orders() {
  return (
    <div>
      <Title level={4}>订单管理</Title>
      <Empty description="功能开发中，敬请期待" style={{ marginTop: 80 }} />
    </div>
  );
}
