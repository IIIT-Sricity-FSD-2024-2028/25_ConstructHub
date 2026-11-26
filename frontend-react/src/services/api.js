// ConstructHub - API client
// The only place that talks HTTP. Screens never call it for data: they dispatch Redux thunks
// (src/features/*/...Slice.js), and every thunk calls `apiRequest` below. What is left on the `api` object is the
// session (login / logout / who is signed in) and file downloads, which produce a file and not state.
//
// A failed request never throws: it resolves to { error: true, status, message } (status 0 = server unreachable).
// The thunks turn that into a rejected action carrying the server's message.

const API_BASE_URL = typeof window !== 'undefined' && window.location && window.location.port === '3000'
  ? window.location.origin
  : 'http://localhost:3000';

export const API_ORIGIN = API_BASE_URL;

// Kept in localStorage on purpose (the "Remember me" e-mail on the login page).
const KEEP_IN_LOCAL_STORAGE = new Set(['ch_remembered_email']);

// Older versions kept a full copy of the demo database (including passwords) in localStorage under "ch_*" keys.
// Remove it once so nothing sensitive or stale is left in the browser.
(function cleanupLegacyLocalData() {
  try {
    if (typeof localStorage === 'undefined') return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ch_') && !KEEP_IN_LOCAL_STORAGE.has(k))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // storage unavailable (private mode): nothing to clean
  }
})();

const authHeader = () => {
  const token = sessionStorage.getItem('ch_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Request helper ─────────────────────────────────────────────────────────
export async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeader(),
    ...(options.headers || {})
  };
  // Let the browser set the multipart boundary when uploading files.
  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  try {
    const res = await fetch(`${API_BASE_URL}/${endpoint.replace(/^\//, '')}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data && data.message
        ? (Array.isArray(data.message) ? data.message.join(', ') : data.message)
        : `Request failed with status ${res.status}`;
      // An expired or invalid session: clear it and go to the login page (a wrong password on /auth/login is not this).
      if (res.status === 401 && !/^\/?auth\/login/.test(endpoint) && authHeader().Authorization) {
        sessionStorage.removeItem('ch_token');
        sessionStorage.removeItem('ch_user');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.assign('/login');
      }
      return { error: true, status: res.status, message: msg };
    }

    return data;
  } catch (err) {
    // Network unreachable or offline: status 0, shown to the user as an error
    return { error: true, status: 0, message: err.message || 'Network error' };
  }
}

/** Private files (receipts, invoices, drawings): fetch with the login token, then save the blob in the browser. */
async function downloadFile(endpoint, fileName, failText) {
  try {
    const res = await fetch(`${API_BASE_URL}/${endpoint}`, { headers: authHeader() });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { error: true, status: res.status, message: (data && data.message) || failText };
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { success: true };
  } catch {
    return { error: true, status: 0, message: `Network error: ${failText.charAt(0).toLowerCase()}${failText.slice(1)}` };
  }
}

const enc = encodeURIComponent;

// ── Session and downloads ──────────────────────────────────────────────────
export const api = {
  async login(email, password) {
    const res = await apiRequest('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (res && res.accessToken) {
      sessionStorage.setItem('ch_token', res.accessToken);
      sessionStorage.setItem('ch_user', JSON.stringify(res.user));
      return { success: true, user: res.user, token: res.accessToken };
    }

    // Server unreachable: do NOT fall back to a local/mock login. The backend verifies every request,
    // so an offline "session" could not call any protected API anyway.
    if (res && res.error && res.status === 0) {
      return { error: true, message: 'Cannot reach the server. Please make sure the backend is running and try again.' };
    }

    return { error: true, message: res?.message || 'Invalid email or password.' };
  },

  registerClient(data) {
    return apiRequest('auth/register-client', { method: 'POST', body: JSON.stringify(data) });
  },

  getCurrentUser() {
    try {
      const u = sessionStorage.getItem('ch_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user) {
    sessionStorage.setItem('ch_user', JSON.stringify(user));
  },

  getToken() {
    return sessionStorage.getItem('ch_token');
  },

  logout() {
    sessionStorage.removeItem('ch_token');
    sessionStorage.removeItem('ch_user');
    window.location.href = '/login';
  },

  downloadExpenseReceipt(expenseId, receipt) {
    return downloadFile(`expenses/${enc(expenseId)}/receipts/${enc(receipt.id)}`, receipt.originalName || 'receipt', 'Could not download the receipt.');
  },

  downloadGrnInvoice(grnId, name) {
    return downloadFile(`goods-receipts/${enc(grnId)}/invoice`, name || 'vendor-invoice', 'Could not download the invoice.');
  },

  downloadRequirementDocument(requirementId, doc) {
    return downloadFile(`requirements/${enc(requirementId)}/documents/${enc(doc.id)}`, doc.originalName || 'document', 'Could not download the document.');
  },
};
