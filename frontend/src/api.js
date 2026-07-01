import axios from 'axios';

// Create Axios Instance
const api = axios.create({
  baseURL: '', // Using relative URL since Vite proxy handles localhost:5000 in dev
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
  const response = await api.post('/api/registration', patientData);
  return response.data;
};

export const getFormMetadata = async () => {
  const response = await api.get('/api/registration/form');
  return response.data;
};

export const getDoctorsList = async () => {
  const response = await api.get('/api/master/doctors');
  return response.data;
};

export const getVisitTypesList = async () => {
  const response = await api.get('/api/master/visit-types');
  return response.data;
};

// Internal Authenticated API Calls
export const loginUser = async (username, password) => {
  const response = await api.post('/api/login', { username, password });
  return response.data;
};

export const getPendingRegistrations = async () => {
  const response = await api.get('/api/registration/pending');
  return response.data;
};

export const approveRegistration = async (tmpId, approvalData) => {
  const response = await api.post(`/api/registration/approve/${tmpId}`, approvalData);
  return response.data;
};

export const rejectRegistration = async (tmpId, remarks) => {
  const response = await api.post(`/api/registration/reject/${tmpId}`, { remarks });
  return response.data;
};

export default api;
