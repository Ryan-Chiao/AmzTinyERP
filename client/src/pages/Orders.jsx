import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Select, DatePicker, Button, Alert, Drawer,
  Tag, Space, Typography, Descriptions, Divider, Spin,
} from 'antd';
import { WarningOutlined, ClearOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getOrders, getOrderDetail } from '../api/index';

const { RangePicker } = DatePicker;
const { Text } = Typography;

const STATUS_CONFIG = {
  PENDING:       { color: 'blue',   label: '待处理' },
  UNSHIPPED:     { color: 'orange', label: '待发货' },
  SHIPPED:       { color: 'cyan',   label: '已发货' },
  DELIVERED:     { color: 'green',  label: '已送达' },
  CANCELED:      { color: 'red',    label: '已取消' },
  UNFULFILLABLE: { color: 'red',    label: '无法履行' },
};

const isAbnormal = (r) => ['CANCELED', 'UNFULFILLABLE'].includes(r.status);

const columns = [
  {
    title: '订单号',
    dataIndex: 'amazonOrderId',
    render: (v) => <Text copyable code>{v}</Text>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    render: (v) => {
      const cfg = STATUS_CONFIG[v] ?? { color: 'default', label: v };
      return (
        <Tag color={cfg.color}>
          {v === 'UNFULFILLABLE' && <WarningOutlined style={{ marginRight: 4 }} />}
          {cfg.label}
        </Tag>
      );
    },
  },
  {
    title: '金额',
    dataIndex: 'totalAmount',
    align: 'right',
    render: (v) => `$${Number(v).toFixed(2)}`,
  },
  {
    title: '货币',
    dataIndex: 'currency',
    render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
  },
  {
    title: '下单时间',
    dataIndex: 'purchaseDate',
    render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
  },
  {
    title: '最后更新',
    dataIndex: 'lastUpdateDate',
    render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
  },
];

const itemColumns = [
  { title: '商品名称', dataIndex: 'title' },
  { title: 'ASIN', dataIndex: 'asin', render: (v) => <Text code>{v}</Text> },
  { title: 'SKU', dataIndex: 'sellerSku', render: (v) => <Text code>{v}</Text> },
  { title: '数量', dataIndex: 'quantity' },
  { title: '单价', dataIndex: 'unitPrice', render: (v) => `$${Number(v).toFixed(2)}` },
];

const PAGE_SIZE = 20;

export default function Orders() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [dateRange, setDateRange] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const buildParams = useCallback((p = page) => {
    const params = { page: p, pageSize: PAGE_SIZE };
    if (statusFilter) params.status = statusFilter;
    if (dateRange?.[0]) params.dateFrom = dateRange[0].toISOString();
    if (dateRange?.[1]) params.dateTo = dateRange[1].toISOString();
    return params;
  }, [page, statusFilter, dateRange]);

  const fetchData = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders(params);
      setData(res.data ?? res.orders ?? res);
      setTotal(res.total ?? res.pagination?.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData({ page: 1, pageSize: PAGE_SIZE });
  }, [fetchData]);

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
    fetchData({ page: 1, pageSize: PAGE_SIZE, status: val,
      ...(dateRange?.[0] ? { dateFrom: dateRange[0].toISOString() } : {}),
      ...(dateRange?.[1] ? { dateTo: dateRange[1].toISOString() } : {}),
    });
  };

  const handleDateChange = (dates) => {
    setDateRange(dates);
    setPage(1);
    fetchData({
      page: 1, pageSize: PAGE_SIZE,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(dates?.[0] ? { dateFrom: dates[0].toISOString() } : {}),
      ...(dates?.[1] ? { dateTo: dates[1].toISOString() } : {}),
    });
  };

  const handleClear = () => {
    setStatusFilter(undefined);
    setDateRange(null);
    setPage(1);
    fetchData({ page: 1, pageSize: PAGE_SIZE });
  };

  const handlePageChange = (p) => {
    setPage(p);
    fetchData(buildParams(p));
  };

  const handleRowClick = async (record) => {
    setDrawerOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await getOrderDetail(record.amazonOrderId);
      setDetail(res.data ?? res);
    } catch {
      setDetail(record);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <style>{`.abnormal-order-row td { background-color: #fff2f0 !important; }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>订单管理</Typography.Title>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="全部状态"
          allowClear
          style={{ width: 140 }}
          value={statusFilter}
          onChange={handleStatusChange}
          options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <RangePicker value={dateRange} onChange={handleDateChange} />
        <Button icon={<ClearOutlined />} onClick={handleClear}>清除筛选</Button>
      </Space>

      {error && (
        <Alert type="error" message={error} style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => fetchData(buildParams())}>重试</Button>}
        />
      )}

      <Table
        rowKey="amazonOrderId"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowClassName={(r) => (isAbnormal(r) ? 'abnormal-order-row' : '')}
        onRow={(r) => ({ onClick: () => handleRowClick(r), style: { cursor: 'pointer' } })}
        pagination={{
          current: page, pageSize: PAGE_SIZE, total,
          onChange: handlePageChange, showSizeChanger: false,
        }}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="订单详情"
        width={520}
        footer={<Button onClick={() => setDrawerOpen(false)}>关闭</Button>}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin /></div>
        ) : detail ? (
          <>
            <Descriptions title="订单信息" column={1} bordered size="small">
              <Descriptions.Item label="订单号">
                <Text copyable code>{detail.amazonOrderId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {(() => {
                  const cfg = STATUS_CONFIG[detail.status] ?? { color: 'default', label: detail.status };
                  return <Tag color={cfg.color}>{cfg.label}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="总金额">
                ${Number(detail.totalAmount).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">
                {dayjs(detail.purchaseDate).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新">
                {dayjs(detail.lastUpdateDate).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Typography.Title level={5}>商品明细</Typography.Title>
            <Table
              rowKey={(r, i) => `${r.asin}-${i}`}
              columns={itemColumns}
              dataSource={detail.orderItems ?? []}
              pagination={false}
              size="small"
            />
          </>
        ) : null}
      </Drawer>
    </>
  );
}
