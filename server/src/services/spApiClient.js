/**
 * spApiClient.js
 * Axios 实例，自动附加 SP-API Access Token，支持 401 时自动刷新。
 */

const axios = require('axios');

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * 获取（或刷新）LWA Access Token
 */
async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const { SP_API_CLIENT_ID, SP_API_CLIENT_SECRET, SP_API_REFRESH_TOKEN } = process.env;

  if (!SP_API_CLIENT_ID || !SP_API_CLIENT_SECRET || !SP_API_REFRESH_TOKEN) {
    throw new Error('SP-API 凭证未配置，请检查 .env 中的 SP_API_CLIENT_ID / SP_API_CLIENT_SECRET / SP_API_REFRESH_TOKEN');
  }

  const res = await axios.post(
    LWA_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: SP_API_REFRESH_TOKEN,
      client_id: SP_API_CLIENT_ID,
      client_secret: SP_API_CLIENT_SECRET,
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
    baseURL: process.env.SP_API_ENDPOINT || 'https://sellingpartnerapi-na.amazon.com',
    timeout: 15000,
  });

  // 请求拦截：注入 Access Token
  client.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    config.headers['x-amz-access-token'] = token;
    return config;
  });

  // 响应拦截：401 时清除缓存并重试一次
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401 && !error.config._retried) {
        cachedToken = null;
        tokenExpiresAt = 0;
        error.config._retried = true;
        const token = await getAccessToken();
        error.config.headers['x-amz-access-token'] = token;
        return client(error.config);
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
