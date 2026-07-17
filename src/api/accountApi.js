import axios from 'axios';

const accountApi = axios.create({
  baseURL: import.meta.env.VITE_ACCOUNT_API_BASE_URL || 'http://localhost:8081/api/v2',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
});

accountApi.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('banquito_web_personas_auth');
    const idToken = stored ? JSON.parse(stored)?.idToken : null;
    if (idToken) {
      config.headers['Authorization'] = `Bearer ${idToken}`;
    }
  } catch {
    // no-op: request proceeds without the auth header
  }
  return config;
});

export const getAccountsByCustomerId = (customerId) => {
  return accountApi.get(`/accounts/customer/${customerId}`);
};

export const transferP2P = (payload) => {
  return accountApi.post('/accounts/transfer/p2p', payload);
};

export const transferExternal = (payload) => {
  return accountApi.post('/accounts/transfer/external', payload);
};

export const getAccountTransactions = (accountId, page = 0, size = 10) => {
  return accountApi.get(`/accounts/${accountId}/transactions`, { params: { page, size } });
};

export default accountApi;