import axios from 'axios';

const partyApi = axios.create({
  baseURL: `${import.meta.env.VITE_PARTY_API_BASE_URL || 'http://localhost:8083'}/api/v2`,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
});

export const loginCustomer = (username, password) => {
  return partyApi.post('/auth/login', { username, password });
};

export const changePassword = (username, currentPassword, newPassword) => {
  return partyApi.put('/auth/change-password', { username, currentPassword, newPassword });
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