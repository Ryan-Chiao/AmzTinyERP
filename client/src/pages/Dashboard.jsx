import React, { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Statistic, Button, Skeleton,
  Result, message, Typography, Spin, Empty, Table, Radio, Badge, Tooltip,
} from 'antd';
import { ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, triggerSync, getChartData, getTopAsins } from '../api/index';

const { Title, Text } = Typography;

// 排名徽标颜色
const RANK_COLORS = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

// 昨日对比组件
function DiffBadge({ current, yesterday, prefix = '' }) {
  if (yesterday == null) return null;
  const cur = parseFloat(current) || 0;
  const yes = parseFloat(yesterday) || 0;
  const diff = parseFloat((cur - yes).toFixed(2));
  if (diff > 0) return (
    <Text type="success" style={{ fontSize: 12 }}>
      <ArrowUpOutlined /> {prefix}{diff}
    </Text>
  );
  if (diff < 0) return (
    <Text type="danger" style={{ fontSize: 12 }}>
      <ArrowDownOutlined /> {prefix}{Math.abs(diff)}
    </Text>
  );
  return <Text type="secondary" style={{ fontSize: 12 }}>— 持平</Text>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // 图表状态
  const [metric, setMetric] = useState('revenue');
  const [days, setDays] = useState(7);
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);

  // TOP10 状态
  const [groupBy, setGroupBy] = useState('child');
  const [topAsins, setTopAsins] = useState([]);
  const [topLoading, setTopLoading] = useState(true);

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
      const res = await getChartData({ metric, days });
      setChartData(res.data ?? res);
    } catch {
      setChartData(null);
    } finally {
      setChartLoading(false);
    }
  }, [metric, days]);

  const fetchTopAsins = useCallback(async () => {
    setTopLoading(true);
    try {
      const res = await getTopAsins({ groupBy });
      setTopAsins(res.data ?? []);
    } catch {
      setTopAsins([]);
    } finally {
      setTopLoading(false);
    }
  }, [groupBy]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchChartData(); }, [fetchChartData]);
  useEffect(() => { fetchTopAsins(); }, [fetchTopAsins]);

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

  // 环形图数据
  const pieData = stats ? [
    { type: '正常库存', value: Math.max(0, (stats.totalSkus ?? 0) - (stats.lowStockCount ?? 0)) },
    { type: '低库存预警', value: stats.lowStockCount ?? 0 },
  ] : [];

  // 柱状图颜色
  const chartColor = { revenue: '#1677ff', netRevenue: '#52c41a', quantity: '#fa8c16' }[metric];

  // TOP10 表格列
  const topColumns = [
    {
      title: '排名', dataIndex: 'rank', width: 64, align: 'center',
      render: (rank) => RANK_COLORS[rank]
        ? <span style={{ color: RANK_COLORS[rank], fontWeight: 700, fontSize: 18 }}>●</span>
        : <Text style={{ fontWeight: 600 }}>{rank}</Text>,
    },
    {
      title: '商品', dataIndex: 'title',
      render: (title, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={r.imageUrl} alt="" width={32} height={32} style={{ borderRadius: 4, objectFit: 'cover' }} />
          <Tooltip title={title}>
            <Text ellipsis style={{ maxWidth: 200 }}>{title}</Text>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'ASIN', dataIndex: 'asin', width: 130,
      render: (asin) => <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>{asin}</Text>,
    },
    { title: '销量', dataIndex: 'quantity', align: 'right', width: 70 },
    {
      title: '销售额', dataIndex: 'revenue', align: 'right', width: 100,
      render: (v) => <Text>${v}</Text>,
    },
    {
      title: '净销售额', dataIndex: 'netRevenue', align: 'right', width: 90,
      render: (v) => v === '--' ? <Text type="secondary">--</Text> : <Text>${v}</Text>,
    },
  ];

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>数据总览</Title>
        <Button type="primary" icon={<ReloadOutlined />} loading={syncing} onClick={handleSync}>
          手动刷新
        </Button>
      </div>

      {/* ── 统计卡片 ───────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        {/* 今日订单 */}
        <Col xs={12} sm={8} md={8} lg={5}>
          <Card>
            <Statistic title="今日订单" value={stats?.todayOrders ?? '--'} suffix="单" />
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>昨日 {stats?.yesterdayOrders ?? '--'} 单</Text>
              <DiffBadge current={stats?.todayOrders} yesterday={stats?.yesterdayOrders} />
            </div>
          </Card>
        </Col>
        {/* 今日销售额 */}
        <Col xs={12} sm={8} md={8} lg={5}>
          <Card>
            <Statistic title="今日销售额" value={stats?.todayRevenue ?? '--'} prefix="$" precision={2} />
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>昨日 ${stats?.yesterdayRevenue ?? '--'}</Text>
              <DiffBadge current={stats?.todayRevenue} yesterday={stats?.yesterdayRevenue} prefix="$" />
            </div>
          </Card>
        </Col>
        {/* 本月销售额 */}
        <Col xs={12} sm={8} md={8} lg={5}>
          <Card>
            <Statistic title="本月销售额" value={stats?.monthRevenue ?? '--'} prefix="$" precision={2} />
          </Card>
        </Col>
        {/* 在售 SKU */}
        <Col xs={12} sm={8} md={8} lg={5}>
          <Card>
            <Statistic title="在售 SKU 数" value={stats?.totalSkus ?? '--'} suffix="个" />
          </Card>
        </Col>
        {/* 低库存预警 */}
        <Col xs={12} sm={8} md={8} lg={4}>
          <Card
            hoverable={stats?.lowStockCount > 0}
            onClick={() => stats?.lowStockCount > 0 && navigate('/inventory?lowStockOnly=true')}
            style={{ cursor: stats?.lowStockCount > 0 ? 'pointer' : 'default' }}
          >
            <Statistic
              title="低库存预警"
              value={stats?.lowStockCount ?? '--'}
              suffix="个"
              valueStyle={stats?.lowStockCount > 0 ? { color: '#ff4d4f' } : undefined}
            />
            <div style={{ marginTop: 8 }}>
              {stats?.lowStockCount > 0
                ? <Text type="danger" style={{ fontSize: 12 }}>点击查看 →</Text>
                : <Text type="success" style={{ fontSize: 12 }}>库存充足</Text>}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── 业绩走势图 ─────────────────────────────────────── */}
      <Card
        style={{ marginTop: 24 }}
        title="业绩走势"
        extra={
          <div style={{ display: 'flex', gap: 12 }}>
            <Radio.Group
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
              options={[
                { label: '销售额', value: 'revenue' },
                { label: '净销售额', value: 'netRevenue' },
                { label: '销量', value: 'quantity' },
              ]}
            />
            <Radio.Group
              value={days}
              onChange={(e) => setDays(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
              options={[
                { label: '近7天', value: 7 },
                { label: '近30天', value: 30 },
              ]}
            />
          </div>
        }
      >
        {chartLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280 }}>
            <Spin />
          </div>
        ) : metric === 'netRevenue' ? (
          <Empty description="净销售额数据将在 SP-API 对接后显示" style={{ padding: '40px 0' }} />
        ) : chartData?.series?.length ? (
          <Column
            data={chartData.series}
            xField="date"
            yField="value"
            color={chartColor}
            height={280}
            label={false}
            tooltip={{ formatter: (d) => ({ name: metric === 'quantity' ? '销量' : '销售额', value: metric === 'quantity' ? d.value : `$${d.value}` }) }}
          />
        ) : (
          <Empty description="暂无数据" style={{ padding: '40px 0' }} />
        )}
      </Card>

      {/* ── 环形图 + 热销 TOP10 并排 ────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 库存状态环形图 */}
        <Col xs={24} md={12}>
          <Card title="库存状态分布" style={{ minHeight: 320 }}>
            {pieData.every((d) => d.value === 0) ? (
              <Empty description="暂无数据" style={{ paddingTop: 40 }} />
            ) : (
              <Pie
                data={pieData}
                angleField="value"
                colorField="type"
                innerRadius={0.6}
                height={240}
                color={['#52c41a', '#ff4d4f']}
                label={{ text: 'type', style: { fontSize: 12 } }}
                legend={{ position: 'bottom' }}
              />
            )}
          </Card>
        </Col>

        {/* 今日热销 TOP10 */}
        <Col xs={24} md={12}>
          <Card
            title="今日热销 TOP 10"
            extra={
              <Radio.Group
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                size="small"
                options={[
                  { label: '按子 ASIN', value: 'child' },
                  { label: '按父 ASIN', value: 'parent' },
                ]}
              />
            }
          >
            <Table
              rowKey="asin"
              dataSource={topAsins}
              columns={topColumns}
              loading={topLoading}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
              locale={{ emptyText: <Empty description="暂无今日销售数据" /> }}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
