/**
 * spApiClient.js
 * Axios 实例，自动附加 SP-API Access Token，支持：
 *  - 三模式切换：USE_MOCK > USE_SANDBOX > 生产
 *  - 401 时自动静默刷新 Token 并重试一次
 *  - 429 时指数退避重试（最多 3 次：1s / 2s / 4s）
 *  - 并发限制：同时最多 2 个请求，超出后等待（最多 10 次 × 500ms）
 */

const axios = require('axios');

// ─── 三模式配置 ────────────────────────────────────────────────
const IS_MOCK    = process.env.USE_MOCK    === 'true';
const IS_SANDBOX = process.env.USE_SANDBOX === 'true';

const BASE_URL = IS_MOCK
  ? null  // Mock 模式不发真实请求
  : IS_SANDBOX
    ? 'https://sandbox.sellingpartnerapi-na.amazon.com'
    : (process.env.SP_API_ENDPOINT || 'https://sellingpartnerapi-na.amazon.com');

const LWA_ENDPOINT = 'https://api.amazon.com/auth/o2/token';

// 凭证选择：沙盘用沙盘凭证，生产用生产凭证
const CLIENT_ID     = IS_SANDBOX ? process.env.SP_API_SANDBOX_CLIENT_ID     : process.env.SP_API_CLIENT_ID;
const CLIENT_SECRET = IS_SANDBOX ? process.env.SP_API_SANDBOX_CLIENT_SECRET : process.env.SP_API_CLIENT_SECRET;
const REFRESH_TOKEN = IS_SANDBOX ? process.env.SP_API_SANDBOX_REFRESH_TOKEN : process.env.SP_API_REFRESH_TOKEN;

// 启动日志
if (IS_MOCK) {
  console.log('[模式] Mock 模式（离线）');
} else if (IS_SANDBOX) {
  console.log('[模式] SP-API 沙盘模式');
} else {
  console.log('[模式] SP-API 生产模式');
}

let cachedToken = null;
let tokenExpiresAt = 0;

// ─── 并发限制 ──────────────────────────────────────────────
const MAX_CONCURRENT = 2;
let activeRequests = 0;

async function waitForSlot(maxWaits = 10) {
  let waits = 0;
  while (activeRequests >= MAX_CONCURRENT && waits < maxWaits) {
    await sleep(500);
    waits++;
  }
}

// ─── 工具函数 ──────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 获取（或刷新）LWA Access Token
 */
async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error('SP-API 凭证未配置，请检查 .env 中的凭证字段');
  }

  const res = await axios.post(
    LWA_ENDPOINT,
    new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: REFRESH_TOKEN,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  cachedToken = res.data.access_token;
  tokenExpiresAt = now + res.data.expires_in * 1000;
  return cachedToken;
}

/**
 * 创建带鉴权的 SP-API Axios 实例
 */
function createSpApiClient() {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
  });

  // 请求拦截：并发限制 + 注入 Access Token
  client.interceptors.request.use(async (config) => {
    await waitForSlot();
    activeRequests++;
    try {
      const token = await getAccessToken();
      config.headers['x-amz-access-token'] = token;
    } catch (err) {
      activeRequests--;
      return Promise.reject(err);
    }
    return config;
  });

  // 响应拦截：释放并发槽 + 401 静默刷新 + 429 指数退避
  client.interceptors.response.use(
    (response) => {
      activeRequests = Math.max(0, activeRequests - 1);
      return response;
    },
    async (error) => {
      activeRequests = Math.max(0, activeRequests - 1);

      // 401：清缓存，重试一次
      if (error.response?.status === 401 && !error.config._retried) {
        cachedToken = null;
        tokenExpiresAt = 0;
        error.config._retried = true;
        try {
          const token = await getAccessToken();
          error.config.headers['x-amz-access-token'] = token;
          return client(error.config);
        } catch (refreshErr) {
          return Promise.reject(refreshErr);
        }
      }

      // 429：指数退避重试（最多 3 次：1s / 2s / 4s）
      if (error.response?.status === 429) {
        const retryCount = error.config._retryCount || 0;
        if (retryCount < 3) {
          error.config._retryCount = retryCount + 1;
          const delay = Math.pow(2, retryCount) * 1000;
          console.warn(`[spApiClient] 429 Rate Limit，${delay}ms 后重试（第 ${retryCount + 1} 次）`);
          await sleep(delay);
          return client(error.config);
        }
      }

      const msg = error.response?.data?.errors?.[0]?.message || error.message;
      const code = error.response?.status || 0;
      console.error(`[SP-API Error] ${code} ${msg}`);
      return Promise.reject({ message: msg, code });
    }
  );

  return client;
}

// 单例 client（懒初始化）
let _client = null;
function getSpApiClient() {
  if (!_client) _client = createSpApiClient();
  return _client;
}

module.exports = { getSpApiClient, getAccessToken };
