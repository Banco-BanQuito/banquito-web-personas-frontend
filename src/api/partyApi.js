import axios from 'axios';
import { buildEnv } from '../build-env';

const APIGEE_API_KEY = buildEnv.apigeeApiKey || import.meta.env.VITE_APIGEE_API_KEY || '';
const IDENTITY_PLATFORM_API_KEY = buildEnv.identityPlatformApiKey || import.meta.env.VITE_IDENTITY_PLATFORM_API_KEY || '';

const partyApi = axios.create({
  baseURL: `${import.meta.env.VITE_PARTY_API_BASE_URL || 'http://localhost:8083'}/api/v2`,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
  headers: {
    ...(APIGEE_API_KEY ? { 'x-api-key': APIGEE_API_KEY, apikey: APIGEE_API_KEY } : {})
  },
});

partyApi.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('banquito_web_personas_auth');
    const idToken = stored ? JSON.parse(stored)?.idToken : null;
    if (idToken) {
      config.headers['Authorization'] = `Bearer ${idToken}`;
    }
  } catch {
    return config;
  }
  return config;
});

const SIGN_IN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${IDENTITY_PLATFORM_API_KEY}`;
const UPDATE_URL = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${IDENTITY_PLATFORM_API_KEY}`;
const LOOKUP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${IDENTITY_PLATFORM_API_KEY}`;

function toIdentityEmail(identificacion) {
  return `${identificacion}@banquito.internal`;
}

async function identityFetch(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Error de autenticación');
    error.response = { status: response.status, data };
    throw error;
  }
  return data;
}

export const loginCustomer = async (username, password) => {
  const signInData = await identityFetch(SIGN_IN_URL, {
    email: toIdentityEmail(username),
    password,
    returnSecureToken: true,
  });

  const lookupData = await identityFetch(LOOKUP_URL, { idToken: signInData.idToken });
  const accountInfo = lookupData.users?.[0];
  const mustChangePassword = accountInfo
    ? accountInfo.createdAt === accountInfo.lastLoginAt
    : false;

  const customerRes = await partyApi.get(`/customers/${username}`, {
    headers: { Authorization: `Bearer ${signInData.idToken}` },
  });
  const customer = customerRes.data;

  return {
    data: {
      customerId: customer.id,
      username,
      fullName: customer.fullName || customer.legalName || username,
      customerType: customer.customerType,
      customerStatus: customer.status,
      credentialStatus: 'ACTIVA',
      idToken: signInData.idToken,
      refreshToken: signInData.refreshToken,
      mustChangePassword,
    },
  };
};

export const changePassword = async (username, currentPassword, newPassword) => {
  const signInData = await identityFetch(SIGN_IN_URL, {
    email: toIdentityEmail(username),
    password: currentPassword,
    returnSecureToken: true,
  });

  const updateData = await identityFetch(UPDATE_URL, {
    idToken: signInData.idToken,
    password: newPassword,
    returnSecureToken: true,
  });

  return { data: updateData };
};

export const getCustomer = (id) => {
  return partyApi.get(`/customers/${id}`);
};

export const getBranches = () => {
  return partyApi.get('/branches');
};

export const getCustomerSubtypes = () => {
  return partyApi.get('/customer-subtypes');
};

export const getHolidays = () => {
  return partyApi.get('/holidays');
};

export const getCoreParameters = () => {
  return partyApi.get('/core-parameters');
};

export const getCustomerByAccount = (accountNumber) => {
  return partyApi.get(`/customers/by-account/${accountNumber}`);
};

export default partyApi;
