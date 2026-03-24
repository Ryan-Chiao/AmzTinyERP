import React, { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Statistic, Button, Skeleton,
  Result, message, Typography, Spin, Empty,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Line, Pie } from '@ant-design/plots';
import { getDashboardStats, triggerSync, getChartData } from '../api/index';

const { Title, Text } = Typography;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);
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

  const fetchChartData = useCallback(async () => {
    setChartLoading(true);
    try {
      const res = await getChartData();
      setChartData(res.data ?? res);
    } catch {
      setChartData(null);
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, [fetchStats, fetchChartData]);

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
        extra={<Button type="primary" onClick={fetchStats}>重试</Button>}
      />
    );
  }

  // Pie chart data derived from stats
  const pieData = stats
    ? [
        { type: '正常库存', value: Math.max(0, (stats.totalSkus ?? 0) - (stats.lowStockCount ?? 0)) },
        { type: '低库存预警', value: stats.lowStockCount ?? 0 },
      ]
    : [];

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>数据总览</Title>
        <Button type="primary" icon={<ReloadOutlined />} loading={syncing} onClick={handleSync}>
          手动刷新
        </Button>
      </div>

      {/* Row 1 - Stat cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6} xl={5}>
          <Card>
            <Statistic title="在售 SKU 数" value={stats?.totalSkus ?? '--'} suffix="个" />
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
            <Statistic title="今日订单" value={stats?.todayOrders ?? '--'} suffix="单" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={5}>
          <Card>
            <Statistic title="今日销售额" value={stats?.todayRevenue ?? '--'} prefix="$" precision={2} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <Card>
            <Statistic title="本月销售额" value={stats?.monthRevenue ?? '--'} prefix="$" precision={2} />
          </Card>
        </Col>
      </Row>

      {/* Row 2 - Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* Line Chart: 近7天订单趋势 */}
        <Col xs={24} md={14}>
          <Card title="近7天订单趋势" style={{ minHeight: 280 }}>
            {chartLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <Spin />
              </div>
            ) : chartData?.orderTrend?.length ? (
              <Line
                data={chartData.orderTrend}
                xField="date"
                yField="orders"
                smooth
                point={{ size: 4 }}
                color="#1677ff"
                height={200}
                axis={{ y: { title: '订单数' } }}
              />
            ) : (
              <Empty description="暂无数据" style={{ paddingTop: 40 }} />
            )}
          </Card>
        </Col>

        {/* Pie/Donut Chart: 库存状态分布 */}
        <Col xs={24} md={10}>
          <Card title="库存状态分布" style={{ minHeight: 280 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <Spin />
              </div>
            ) : pieData.every((d) => d.value === 0) ? (
              <Empty description="暂无数据" style={{ paddingTop: 40 }} />
            ) : (
              <Pie
                data={pieData}
                angleField="value"
                colorField="type"
                innerRadius={0.6}
                height={200}
                color={['#52c41a', '#ff4d4f']}
                label={{ text: 'type', style: { fontSize: 12 } }}
                legend={{ position: 'bottom' }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
