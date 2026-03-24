import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Unknown error';
    const code = error.response?.status || 0;
    console.error(`[API Error] code=${code} message=${message}`, error);
    return Promise.reject({ message, code });
  }
);

export default apiClient;
