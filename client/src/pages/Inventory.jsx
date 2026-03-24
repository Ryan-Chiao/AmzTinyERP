import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table, Input, Switch, Alert, Button, Drawer,
  Descriptions, Tag, Space, Typography, Divider, Spin,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getInventory, getInventoryItem } from '../api/index';

const { Text } = Typography;

const isLowStock = (r) => r.fbaAvailable <= r.reorderThreshold;

const columns = [
  {
    title: '商品名称',
    dataIndex: 'title',
    render: (title, r) => (
      <Space>
        {r.imageUrl && (
          <img src={r.imageUrl} alt="" width={32} height={32}
            style={{ objectFit: 'cover', borderRadius: 4 }} />
        )}
        <Text>{title}</Text>
      </Space>
    ),
  },
  {
    title: 'SKU',
    dataIndex: 'sku',
    render: (v) => <Text code>{v}</Text>,
  },
  {
    title: 'ASIN',
    dataIndex: 'asin',
    render: (v) => <Text code>{v}</Text>,
  },
  {
    title: '可售数量',
    dataIndex: 'fbaAvailable',
    render: (v, r) =>
      isLowStock(r) ? (
        <Text strong style={{ color: '#ff4d4f' }}>{v}</Text>
      ) : v,
  },
  { title: '在途数量', dataIndex: 'fbaInbound' },
  { title: '预警阈值', dataIndex: 'reorderThreshold' },
];

export default function Inventory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const debounceRef = useRef(null);

  const fetchData = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInventory(params);
      setData(res.data ?? res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData({}); }, [fetchData]);

  const handleSearch = (value) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(value ? { search: value, lowStockOnly } : { lowStockOnly });
    }, 300);
  };

  const handleLowStock = (checked) => {
    setLowStockOnly(checked);
    fetchData({ search: search || undefined, lowStockOnly: checked });
  };

  const handleRowClick = async (record) => {
    setDrawerOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await getInventoryItem(record.asin);
      setDetail(res.data ?? res);
    } catch {
      setDetail(record);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <style>{`.low-stock-row td { background-color: #fff2f0 !important; }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>库存管理</Typography.Title>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索商品名 / SKU / ASIN"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
          style={{ width: 280 }}
        />
        <Space>
          <Text>仅显示低库存</Text>
          <Switch checked={lowStockOnly} onChange={handleLowStock} />
        </Space>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => fetchData({})}>重试</Button>}
        />
      )}

      <Table
        rowKey="asin"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowClassName={(r) => (isLowStock(r) ? 'low-stock-row' : '')}
        onRow={(r) => ({ onClick: () => handleRowClick(r), style: { cursor: 'pointer' } })}
        pagination={{ pageSize: 20 }}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={detail?.title ?? '商品详情'}
        width={480}
        footer={<Button onClick={() => setDrawerOpen(false)}>关闭</Button>}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin /></div>
        ) : detail ? (
          <>
            <Descriptions title="基本信息" column={1} bordered size="small">
              <Descriptions.Item label="ASIN">
                <Text copyable code>{detail.asin}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="SKU">
                <Text copyable code>{detail.sku}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="父 ASIN">
                {detail.parentAsin ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="当前价格">
                {detail.price != null ? `$${detail.price}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="主图">
                {detail.imageUrl
                  ? <img src={detail.imageUrl} alt="" width={120} height={120} style={{ objectFit: 'contain' }} />
                  : '暂无图片'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="库存状态" column={1} bordered size="small">
              <Descriptions.Item label="可售数量">
                {isLowStock(detail)
                  ? <Text strong style={{ color: '#ff4d4f' }}>{detail.fbaAvailable}</Text>
                  : detail.fbaAvailable}
              </Descriptions.Item>
              <Descriptions.Item label="在途数量">{detail.fbaInbound}</Descriptions.Item>
              <Descriptions.Item label="预警阈值">{detail.reorderThreshold}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="补货参数" column={1} bordered size="small">
              <Descriptions.Item label="补货周期">{detail.leadTimeDays} 天</Descriptions.Item>
              <Descriptions.Item label="安全缓冲">{detail.safetyBufferDays} 天</Descriptions.Item>
              <Descriptions.Item label="销量计算窗口">{detail.salesWindowDays} 天</Descriptions.Item>
            </Descriptions>
          </>
        ) : null}
      </Drawer>
    </>
  );
}
