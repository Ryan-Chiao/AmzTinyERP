import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography, Table, InputNumber, Button, Alert,
  message, Tag, Tooltip,
} from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, MinusOutlined } from '@ant-design/icons';
import apiClient from '../api/client';

const { Title, Text } = Typography;

// ── API calls ─────────────────────────────────────────────
const getPricing = () => apiClient.get('/pricing').then((r) => r.data);
const patchPricing = (asin, data) =>
  apiClient.patch(`/pricing/${asin}`, data).then((r) => r.data);

// ── Buy Box 状态渲染 ─────────────────────────────────────
function BuyBoxTag({ status }) {
  if (status === 'won')
    return <Tag icon={<CheckCircleOutlined />} color="success">Buy Box 赢得</Tag>;
  if (status === 'lost')
    return <Tag icon={<CloseCircleOutlined />} color="error">Buy Box 丢失</Tag>;
  return <Tag icon={<MinusOutlined />} color="default">未知</Tag>;
}

// ── inline InputNumber 单元格 ────────────────────────────
function EditablePrice({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value != null ? Number(value) : null);

  const handleSave = async () => {
    setEditing(false);
    await onSave(val);
  };

  if (editing) {
    return (
      <InputNumber
        autoFocus
        size="small"
        min={0}
        prefix="$"
        value={val}
        onChange={setVal}
        onPressEnter={handleSave}
        onBlur={handleSave}
        style={{ width: 120 }}
      />
    );
  }

  return (
    <Tooltip title="点击编辑">
      <span
        style={{ cursor: 'pointer', color: val != null ? undefined : '#bbb' }}
        onClick={() => setEditing(true)}
      >
        {val != null ? `$${Number(val).toFixed(2)}` : '未设置'}
      </span>
    </Tooltip>
  );
}

export default function Pricing() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPricing();
      setData(res.data ?? []);
    } catch (err) {
      setError(err.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveField = async (asin, field, value) => {
    try {
      const updated = await patchPricing(asin, { [field]: value });
      setData((prev) =>
        prev.map((row) => (row.asin === asin ? { ...row, ...updated } : row))
      );
      messageApi.success('保存成功');
    } catch {
      messageApi.error('保存失败，请重试');
    }
  };

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'title',
      ellipsis: true,
      render: (title, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.sku}</Text>
        </div>
      ),
    },
    {
      title: 'ASIN',
      dataIndex: 'asin',
      width: 130,
      render: (asin) => (
        <Text copyable code style={{ fontSize: 12 }}>{asin}</Text>
      ),
    },
    {
      title: '当前价格',
      dataIndex: 'price',
      width: 110,
      align: 'right',
      render: (price) => <span style={{ fontWeight: 500 }}>${Number(price || 0).toFixed(2)}</span>,
    },
    {
      title: 'Buy Box',
      dataIndex: 'buyBoxStatus',
      width: 140,
      render: (status) => <BuyBoxTag status={status} />,
    },
    {
      title: '最低保护价',
      dataIndex: 'priceFloor',
      width: 130,
      render: (val, row) => (
        <EditablePrice
          value={val}
          onSave={(v) => handleSaveField(row.asin, 'priceFloor', v)}
        />
      ),
    },
    {
      title: '最高保护价',
      dataIndex: 'priceCeiling',
      width: 130,
      render: (val, row) => (
        <EditablePrice
          value={val}
          onSave={(v) => handleSaveField(row.asin, 'priceCeiling', v)}
        />
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>定价管理</Title>
        <Text type="warning" style={{ fontSize: 12 }}>⚠️ 仅供参考，不自动改价</Text>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          action={<Button size="small" onClick={fetchData}>重试</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        rowKey="asin"
        columns={columns}
        dataSource={data}
        loading={loading}
        size="middle"
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        scroll={{ x: 800 }}
      />
    </>
  );
}
