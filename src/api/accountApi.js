import axios from 'axios';
import { buildEnv } from '../build-env';
import { getFreshAuthSession } from './authSession';

const APIGEE_API_KEY = buildEnv.apigeeApiKey || import.meta.env.VITE_APIGEE_API_KEY || '';

const accountApi = axios.create({
  baseURL: import.meta.env.VITE_ACCOUNT_API_BASE_URL || 'http://localhost:8081/api/v2',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
  headers: {
    ...(APIGEE_API_KEY ? { 'x-api-key': APIGEE_API_KEY, apikey: APIGEE_API_KEY } : {})
  },
});

accountApi.interceptors.request.use(async (config) => {
  try {
    const session = await getFreshAuthSession();
    if (session?.idToken) {
      config.headers['Authorization'] = `Bearer ${session.idToken}`;
    }
  } catch {
    return config;
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
