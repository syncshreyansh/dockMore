import { supabase } from './supabase';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

function serializeBody(body) {
  if (body === undefined || body === null) return undefined;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return body;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return body;
  if (body instanceof ArrayBuffer) return body;
  return JSON.stringify(body);
}


async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (err) {
    console.error('[apiClient] Failed to get session token:', err);
    return null;
  }
}


async function request(endpoint, options = {}) {
  const token = await getAuthToken();

  const bodyIsNative = (typeof FormData !== 'undefined' && options.body instanceof FormData) ||
    (typeof Blob !== 'undefined' && options.body instanceof Blob) ||
    options.body instanceof ArrayBuffer;

  const headers = {
    ...(!bodyIsNative ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorPayload;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = { message: response.statusText };
    }

    const errorMessage =
      errorPayload.detail ||
      errorPayload.message ||
      errorPayload.error ||
      `Request failed with status ${response.status}`;

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = errorPayload;
    throw error;
  }

  if (response.status === 204 || response.status === 205) {
    return null;
  }
  if (options.responseType === 'blob') return response.blob();
  if (!response.headers.get('content-type')?.includes('application/json')) {
    return null;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: serializeBody(body),
    }),
  patch: (endpoint, body, options) =>
    request(endpoint, {
      ...options,
      method: 'PATCH',
      body: serializeBody(body),
    }),
  put: (endpoint, body, options) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: serializeBody(body),
    }),
  delete: (endpoint, options) =>
    request(endpoint, { ...options, method: 'DELETE' }),
  download: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET', responseType: 'blob' }),
};

export default apiClient;
