import axios from 'axios';

// Create Axios Instance using Vite environment variable
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to automatically add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ascas_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor to handle JWT expirations/unauthorized automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we are unauthorized and not on the login page, redirect to login
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('ascas_token');
        localStorage.removeItem('ascas_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Public API Calls
export const submitPatientRegistration = async (patientData) => {
  const response = await api.post('/registration', patientData);
  return response.data;
};

export const getFormMetadata = async () => {
  const response = await api.get('/registration/form');
  return response.data;
};

export const getDoctorsList = async () => {
  const response = await api.get('/master/doctors');
  return response.data;
};

export const getVisitTypesList = async () => {
  const response = await api.get('/master/visit-types');
  return response.data;
};

// Internal Authenticated API Calls
export const loginUser = async (username, password) => {
  const response = await api.post('/login', { username, password });
  return response.data;
};

export const getPendingRegistrations = async () => {
  const response = await api.get('/registration/pending');
  return response.data;
};

export const approveRegistration = async (tmpId, approvalData) => {
  const response = await api.post(`/registration/approve/${tmpId}`, approvalData);
  return response.data;
};

export const rejectRegistration = async (tmpId, remarks) => {
  const response = await api.post(`/registration/reject/${tmpId}`, { remarks });
  return response.data;
};

export const registerStaffUser = async (userData) => {
  const response = await api.post('/users/register', userData);
  return response.data;
};

export const getStaffList = async () => {
  const response = await api.get('/users');
  return response.data;
};

export default api;
