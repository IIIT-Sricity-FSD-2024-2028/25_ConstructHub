const api = {
  async request(endpoint, options = {}) {
    const token = sessionStorage.getItem('ch_token');

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem('ch_user');
        sessionStorage.removeItem('ch_token');
      }

      throw new Error(
        data?.message || `Request failed with status ${response.status}`
      );
    }

    return data;
  },

  get(endpoint) {
    return this.request(endpoint, {
      method: 'GET',
    });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  },
};

export default api;