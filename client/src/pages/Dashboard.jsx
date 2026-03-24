import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Button,
  Skeleton,
  Result,
  message,
  Typography,
  Space,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getDashboardStats, triggerSync } from '../api/index';

const { Title, Text } = Typography;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerSync('ALL');
      messageApi.success('同步成功！');
      await fetchStats();
    } catch (err) {
      messageApi.error(`同步失败：${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 4 }} style={{ marginTop: 24 }} />
      </div>
    );
  }

  if (error) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle={error}
        extra={
          <Button type="primary" onClick={fetchStats}>
            重试
          </Button>
        }
      />
    );
  }

  return (
    <>
      {contextHolder}
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>数据总览</Title>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={syncing}
          onClick={handleSync}
        >
          手动刷新
        </Button>
      </div>

      {/* Row 1 - Stat cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6} xl={5}>
          <Card>
            <Statistic
              title="在售 SKU 数"
              value={stats?.totalSkus ?? '--'}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={5}>
          <Card>
            <Statistic
              title="低库存预警"
              value={stats?.lowStockCount ?? '--'}
              suffix="个"
              valueStyle={stats?.lowStockCount > 0 ? { color: '#ff4d4f' } : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={5}>
          <Card>
            <Statistic
              title="今日订单"
              value={stats?.todayOrders ?? '--'}
              suffix="单"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={5}>
          <Card>
            <Statistic
              title="今日销售额"
              value={stats?.todayRevenue ?? '--'}
              prefix="$"
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <Card>
            <Statistic
              title="本月销售额"
              value={stats?.monthRevenue ?? '--'}
              prefix="$"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      {/* Row 2 - Placeholder chart cards */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title="库存状态图" style={{ minHeight: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
              <Text type="secondary">图表开发中</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="近期订单趋势" style={{ minHeight: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
              <Text type="secondary">图表开发中</Text>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
}
