const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle FormData separately
  if (options.body instanceof FormData) {
    delete headers['Content-Type']; // Let browser set boundary
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Attachment streaming returns binary, not JSON — only parse when it is JSON.
  const contentType = response.headers.get('content-type') || '';
  let data;
  if (options.responseType === 'blob' && response.ok) {
    data = await response.blob();
  } else if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    data = {};
  }

  if (!response.ok) {
    // If it's a 401, we might want to clear token and redirect to login, 
    // but auth context usually handles this or we can throw custom error.
    if (response.status === 401) {
      localStorage.removeItem('token');
      // trigger event or just let it throw
      window.dispatchEvent(new Event('unauthorized'));
    }
    
    throw {
      status: response.status,
      message: data.message || `Request failed (${response.status})`,
      errorCode: data.errorCode || 'UNKNOWN_ERROR',
      success: false,
      ...data
    };
  }

  return data;
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body), ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body), ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
};
