// ConstructHub - API client
// Every screen reads and writes through the NestJS backend. There is no offline copy of the data:
// when a request fails, the caller gets { error: true, status, message } (lists come back empty),
// so the UI never shows invented or out-of-date records.

const API_BASE_URL = typeof window !== 'undefined' && window.location && window.location.port === '3000'
  ? window.location.origin
  : 'http://localhost:3000';

export const API_ORIGIN = API_BASE_URL;

// Older versions kept a full copy of the demo database (including passwords) in localStorage under "ch_*" keys.
// Remove it once so nothing sensitive or stale is left in the browser.
(function cleanupLegacyLocalData() {
  try {
    if (typeof localStorage === 'undefined') return;
    Object.keys(localStorage).filter((k) => k.startsWith('ch_')).forEach((k) => localStorage.removeItem(k));
  } catch {
    // storage unavailable (private mode): nothing to clean
  }
})();

// ── Request helper ─────────────────────────────────────────────────────────
async function apiRequest(endpoint, options = {}) {
  const token = sessionStorage.getItem('ch_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      return { error: true, status: res.status, message: msg };
    }

    return data;
  } catch (err) {
    // Network unreachable or offline: status 0, shown to the user as an error
    return { error: true, status: 0, message: err.message || 'Network error' };
  }
}

// Turns an {error:true} result into a thrown Error so try/catch blocks really catch refusals.
export function unwrap(res) {
  if (res && res.error) {
    const e = new Error(res.message || 'Request failed');
    e.status = res.status;
    throw e;
  }
  return res;
}

/** A list response, or [] when the request failed (the page then shows its empty state). */
function asList(res) {
  if (Array.isArray(res)) return res;
  if (res && res.error && typeof console !== 'undefined') console.warn('[api]', res.message);
  return [];
}

/** A single record, or null when the request failed. */
function asOne(res) {
  return res && !res.error ? res : null;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

// ── Exported API Object ───────────────────────────────────────────────────
export const api = {
  // --- Auth ---
  async login(email, password) {
    let res = await apiRequest('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (res && res.accessToken) {
      sessionStorage.setItem('ch_token', res.accessToken);
      sessionStorage.setItem('ch_user', JSON.stringify(res.user));
      return { success: true, user: res.user, token: res.accessToken };
    }

    if (res && res.error && res.status !== 0) {
      return { error: true, message: res.message || 'Invalid email or password.' };
    }

    // Server unreachable: do NOT fall back to a local/mock login. The backend verifies every request,
    // so an offline "session" could not call any protected API anyway.
    if (res && res.error && res.status === 0) {
      return { error: true, message: 'Cannot reach the server. Please make sure the backend is running and try again.' };
    }

    return { error: true, message: res?.message || 'Invalid email or password.' };
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

  // --- Expense claims workflow, bill payments, dashboards (online only) ---
  async getExpenseClaims(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return apiRequest(`expenses${qs ? `?${qs}` : ''}`);
  },
  async getExpenseClaim(id) { return apiRequest(`expenses/${encodeURIComponent(id)}`); },
  async submitExpense(data) { return apiRequest('expenses', { method: 'POST', body: JSON.stringify(data) }); },
  async resubmitExpense(id, data) { return apiRequest(`expenses/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async withdrawExpense(id) { return apiRequest(`expenses/${encodeURIComponent(id)}/withdraw`, { method: 'POST' }); },
  async uploadExpenseReceipts(id, files) {
    const form = new FormData();
    Array.from(files).forEach((f) => form.append('receipts', f));
    return apiRequest(`expenses/${encodeURIComponent(id)}/receipts`, { method: 'POST', body: form });
  },
  /** Receipts are private: fetch with the login token, then save the blob. */
  async downloadExpenseReceipt(expenseId, receipt) {
    const token = sessionStorage.getItem('ch_token');
    try {
      const res = await fetch(`${API_BASE_URL}/expenses/${encodeURIComponent(expenseId)}/receipts/${encodeURIComponent(receipt.id)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return { error: true, status: res.status, message: (data && data.message) || 'Could not download the receipt.' };
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.originalName || 'receipt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return { success: true };
    } catch {
      return { error: true, status: 0, message: 'Network error while downloading the receipt.' };
    }
  },
  async verifyExpense(id, note) { return apiRequest(`expenses/${encodeURIComponent(id)}/verify`, { method: 'POST', body: JSON.stringify({ note }) }); },
  async pmReturnExpense(id, note) { return apiRequest(`expenses/${encodeURIComponent(id)}/pm-return`, { method: 'POST', body: JSON.stringify({ note }) }); },
  async pmRejectExpense(id, note) { return apiRequest(`expenses/${encodeURIComponent(id)}/pm-reject`, { method: 'POST', body: JSON.stringify({ note }) }); },
  async approveExpense(id, note) { return apiRequest(`expenses/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({ note }) }); },
  async fmReturnExpense(id, note) { return apiRequest(`expenses/${encodeURIComponent(id)}/return`, { method: 'POST', body: JSON.stringify({ note }) }); },
  async fmRejectExpense(id, note) { return apiRequest(`expenses/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ note }) }); },
  async reimburseExpense(id, reference) { return apiRequest(`expenses/${encodeURIComponent(id)}/reimburse`, { method: 'POST', body: JSON.stringify({ reference }) }); },

  async getBillPayments(billId) { return apiRequest(`bills/${encodeURIComponent(billId)}/payments`); },
  async payBill(billId, data) { return apiRequest(`bills/${encodeURIComponent(billId)}/payments`, { method: 'POST', body: JSON.stringify(data) }); },
  async getPayments() { return apiRequest('payments'); },
  async getDashboard() { return apiRequest('dashboard'); },

  // --- Procurement & stock (online only) ---
  async getSuppliers() { return apiRequest('suppliers'); },
  async createSupplier(data) { return apiRequest('suppliers', { method: 'POST', body: JSON.stringify(data) }); },
  async updateSupplier(id, data) { return apiRequest(`suppliers/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async deleteSupplier(id) { return apiRequest(`suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' }); },

  async getMaterialRequests(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return apiRequest(`material-requests${qs ? `?${qs}` : ''}`);
  },
  async createMaterialRequest(data) { return apiRequest('material-requests', { method: 'POST', body: JSON.stringify(data) }); },
  async cancelMaterialRequest(id) { return apiRequest(`material-requests/${encodeURIComponent(id)}/cancel`, { method: 'POST' }); },
  async approveMaterialRequest(id, note) { return apiRequest(`material-requests/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({ note }) }); },
  async rejectMaterialRequest(id, note) { return apiRequest(`material-requests/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ note }) }); },

  async getPurchaseOrders(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return apiRequest(`purchase-orders${qs ? `?${qs}` : ''}`);
  },
  async getPurchaseOrder(id) { return apiRequest(`purchase-orders/${encodeURIComponent(id)}`); },
  async createPurchaseOrder(data) { return apiRequest('purchase-orders', { method: 'POST', body: JSON.stringify(data) }); },
  async approvePurchaseOrder(id, note) { return apiRequest(`purchase-orders/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({ note }) }); },
  async rejectPurchaseOrder(id, note) { return apiRequest(`purchase-orders/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ note }) }); },
  async cancelPurchaseOrder(id, reason) { return apiRequest(`purchase-orders/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }); },

  async getGoodsReceipts(poId) { return apiRequest(`goods-receipts${poId ? `?poId=${encodeURIComponent(poId)}` : ''}`); },
  async createGoodsReceipt(data) { return apiRequest('goods-receipts', { method: 'POST', body: JSON.stringify(data) }); },
  async uploadGrnInvoice(grnId, file) {
    const form = new FormData();
    form.append('invoice', file);
    return apiRequest(`goods-receipts/${encodeURIComponent(grnId)}/invoice`, { method: 'POST', body: form });
  },
  async downloadGrnInvoice(grnId, name) {
    const token = sessionStorage.getItem('ch_token');
    try {
      const res = await fetch(`${API_BASE_URL}/goods-receipts/${encodeURIComponent(grnId)}/invoice`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return { error: true, status: res.status, message: (data && data.message) || 'Could not download the invoice.' };
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = name || 'vendor-invoice';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return { success: true };
    } catch {
      return { error: true, status: 0, message: 'Network error while downloading the invoice.' };
    }
  },
  async getStockAvailable(projectId) { return apiRequest(`reports/stock-available?projectId=${encodeURIComponent(projectId)}`); },
  async getProjectTeam(projectId) { return apiRequest(`tasks/team/${encodeURIComponent(projectId)}`); },
  async getReport(id) { return apiRequest(`reports/${encodeURIComponent(id)}`); },
  async getBillableSheet(projectId) { return apiRequest(`bills/billable/${encodeURIComponent(projectId)}`); },
  async getFeedback() { return apiRequest('feedback'); },
  async submitFeedback(data) { return apiRequest('feedback', { method: 'POST', body: JSON.stringify(data) }); },
  async getBudgetTopups() { return apiRequest('budget-topups'); },
  async requestBudgetTopup(data) { return apiRequest('budget-topups', { method: 'POST', body: JSON.stringify(data) }); },
  async approveBudgetTopup(id, note) { return apiRequest(`budget-topups/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({ note }) }); },
  async rejectBudgetTopup(id, note) { return apiRequest(`budget-topups/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ note }) }); },

  async getStock(projectId) { return apiRequest(`stock${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`); },
  async getStockLedger(projectId) { return apiRequest(`stock/ledger${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`); },
  async getMaterialIssues(projectId) { return apiRequest(`stock/issues${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`); },
  async createMaterialIssue(data) { return apiRequest('stock/issues', { method: 'POST', body: JSON.stringify(data) }); },

  async getProcurementSettings() { return apiRequest('procurement/settings'); },
  async updateProcurementSettings(poApprovalLimit) { return apiRequest('procurement/settings', { method: 'PATCH', body: JSON.stringify({ poApprovalLimit }) }); },

  // --- Milestones & progress (online only) ---
  async getMilestones(projectId) {
    return apiRequest(`milestones${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`);
  },
  async getProjectProgress(projectId) {
    return apiRequest(`milestones/progress/${encodeURIComponent(projectId)}`);
  },
  async createMilestone(data) {
    return apiRequest('milestones', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateMilestone(id, data) {
    return apiRequest(`milestones/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async deleteMilestone(id) {
    return apiRequest(`milestones/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  async approveMilestone(id) {
    return apiRequest(`milestones/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  },
  async reopenMilestone(id) {
    return apiRequest(`milestones/${encodeURIComponent(id)}/reopen`, { method: 'POST' });
  },

  // --- Client self-signup ---
  async registerClient(data) {
    return apiRequest('auth/register-client', { method: 'POST', body: JSON.stringify(data) });
  },

  // --- Marketplace: requirements, quotations, contracts (online only) ---
  async getRequirements(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return apiRequest(`requirements${qs ? `?${qs}` : ''}`);
  },
  async getRequirement(id) {
    return apiRequest(`requirements/${encodeURIComponent(id)}`);
  },
  async createRequirement(data) {
    return apiRequest('requirements', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateRequirement(id, data) {
    return apiRequest(`requirements/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async closeRequirement(id) {
    return apiRequest(`requirements/${encodeURIComponent(id)}/close`, { method: 'POST' });
  },
  async uploadRequirementDocuments(id, files) {
    const form = new FormData();
    Array.from(files).forEach((f) => form.append('documents', f));
    return apiRequest(`requirements/${encodeURIComponent(id)}/documents`, { method: 'POST', body: form });
  },
  /** Documents are private: fetch with the login token, then save the blob. */
  async downloadRequirementDocument(requirementId, doc) {
    const token = sessionStorage.getItem('ch_token');
    try {
      const res = await fetch(
        `${API_BASE_URL}/requirements/${encodeURIComponent(requirementId)}/documents/${encodeURIComponent(doc.id)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return { error: true, status: res.status, message: (data && data.message) || 'Could not download the document.' };
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return { success: true };
    } catch {
      return { error: true, status: 0, message: 'Network error while downloading the document.' };
    }
  },
  async getRequirementQuotations(id) {
    return apiRequest(`requirements/${encodeURIComponent(id)}/quotations`);
  },
  async submitQuotation(requirementId, data) {
    return apiRequest(`requirements/${encodeURIComponent(requirementId)}/quotations`, { method: 'POST', body: JSON.stringify(data) });
  },
  async getQuotations() {
    return apiRequest('quotations');
  },
  async updateQuotation(id, data) {
    return apiRequest(`quotations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async withdrawQuotation(id) {
    return apiRequest(`quotations/${encodeURIComponent(id)}/withdraw`, { method: 'POST' });
  },
  async rejectQuotation(id, reason) {
    return apiRequest(`quotations/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
  },
  // 3-role estimation: Company Admin -> PM stages -> FM costs -> Company Admin markup
  async assignEstimateTeam(requirementId, data) {
    return apiRequest(`requirements/${encodeURIComponent(requirementId)}/assign-team`, { method: 'POST', body: JSON.stringify(data) });
  },
  async getEstimates() {
    return apiRequest('quotations/estimates');
  },
  async submitPmEstimate(id, data) {
    return apiRequest(`quotations/${encodeURIComponent(id)}/pm-estimate`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async submitFmEstimate(id, data) {
    return apiRequest(`quotations/${encodeURIComponent(id)}/fm-estimate`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async releaseQuotation(id, data) {
    return apiRequest(`quotations/${encodeURIComponent(id)}/release`, { method: 'POST', body: JSON.stringify(data) });
  },
  async acceptQuotation(id) {
    return apiRequest(`quotations/${encodeURIComponent(id)}/accept`, { method: 'POST' });
  },
  async getContracts() {
    return apiRequest('contracts');
  },

  // --- Platform admin: onboarding approval & subscription plans ---
  async setCompanyApproval(id, decision, reason) {
    return apiRequest(`companies/${id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, reason })
    });
  },

  async getPlans() {
    const res = await apiRequest('plans');
    return res && !res.error ? res : null;
  },

  async updatePlan(name, changes) {
    return apiRequest(`plans/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });
  },

  async updateOverageRates(changes) {
    return apiRequest('plans/overage-rates', {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });
  },

  // --- Companies ---
  async getCompanies() { return asList(await apiRequest('companies')); },
  async getCompanyById(id) { return asOne(await apiRequest(`companies/${encodeURIComponent(id)}`)); },
  async onboardCompany(payload) { return apiRequest('companies/onboard', json('POST', payload)); },
  async updateCompany(id, changes) { return apiRequest(`companies/${encodeURIComponent(id)}`, json('PATCH', changes)); },
  async toggleOverage(id, payload) { return apiRequest(`companies/${encodeURIComponent(id)}/overage`, json('PATCH', payload)); },
  async getCompanySubscription(id) { return asOne(await apiRequest(`companies/${encodeURIComponent(id)}/subscription`)); },

  // --- Users ---
  async getUsers(companyId) {
    let list = asList(await apiRequest('users'));
    // Clients are platform-level (no companyId); the server already limits which ones this user may see.
    if (companyId) list = list.filter((u) => u.companyId === companyId || u.role === 'client');
    return list;
  },
  async createUser(data) { return apiRequest('users', json('POST', data)); },
  async updateUser(id, changes) { return apiRequest(`users/${encodeURIComponent(id)}`, json('PATCH', changes)); },
  async deleteUser(id) { return apiRequest(`users/${encodeURIComponent(id)}`, { method: 'DELETE' }); },

  // --- Projects (created only when a client awards a quotation; spend and progress come from the server) ---
  async getProjects(companyId) {
    let list = asList(await apiRequest('projects'));
    if (companyId) list = list.filter((p) => !p.companyId || p.companyId === companyId);
    return list;
  },
  async getProjectById(id) { return asOne(await apiRequest(`projects/${encodeURIComponent(id)}`)); },
  async updateProject(id, changes) { return apiRequest(`projects/${encodeURIComponent(id)}`, json('PATCH', changes)); },
  async deleteProject(id) { return apiRequest(`projects/${encodeURIComponent(id)}`, { method: 'DELETE' }); },

  // --- Tasks ---
  async getTasks(companyId) {
    let list = asList(await apiRequest('tasks'));
    if (companyId) list = list.filter((t) => !t.companyId || t.companyId === companyId);
    return list;
  },
  async getTaskById(id) { return asOne(await apiRequest(`tasks/${encodeURIComponent(id)}`)); },
  async createTask(data) { return apiRequest('tasks', json('POST', data)); },
  async updateTask(id, changes) { return apiRequest(`tasks/${encodeURIComponent(id)}`, json('PATCH', changes)); },
  async deleteTask(id) { return apiRequest(`tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }); },

  // --- Bills (the server already limits a finance manager to their own projects) ---
  async getBills(companyId) {
    let list = asList(await apiRequest('bills'));
    if (companyId) list = list.filter((b) => !b.companyId || b.companyId === companyId);
    return list;
  },
  async getBillById(id) { return asOne(await apiRequest(`bills/${encodeURIComponent(id)}`)); },
  async createBill(data) { return apiRequest('bills', json('POST', data)); },
  async updateBill(id, changes) { return apiRequest(`bills/${encodeURIComponent(id)}`, json('PATCH', changes)); },
  async deleteBill(id) { return apiRequest(`bills/${encodeURIComponent(id)}`, { method: 'DELETE' }); },

  // --- Expenses (read-only list; the claim workflow calls are above) ---
  async getExpenses(companyId) {
    let list = asList(await apiRequest('expenses'));
    if (companyId) list = list.filter((e) => !e.companyId || e.companyId === companyId);
    return list;
  },

  // --- Reports ---
  async uploadReportPhotos(files) {
    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));
    return apiRequest('reports/upload', { method: 'POST', body: formData });
  },
  async getReports(companyId) {
    let list = asList(await apiRequest('reports'));
    if (companyId) list = list.filter((r) => !r.companyId || r.companyId === companyId);
    return list;
  },
  async getReportById(id) { return asOne(await apiRequest(`reports/${encodeURIComponent(id)}`)); },
  async createReport(data) { return apiRequest('reports', json('POST', data)); },
  async deleteReport(id) { return apiRequest(`reports/${encodeURIComponent(id)}`, { method: 'DELETE' }); },

  // --- Messages (the server returns only the caller's own conversations) ---
  async getMessages() { return asList(await apiRequest('messages')); },
  async sendMessage(data) { return apiRequest('messages', json('POST', data)); },

  // --- Notifications ---
  async getNotifications(userId) {
    let list = asList(await apiRequest('notifications'));
    if (userId) list = list.filter((n) => n.userId === userId);
    return list;
  },
  async createNotification(data) { return apiRequest('notifications', json('POST', data)); },
  async markNotificationRead(id) { return apiRequest(`notifications/${encodeURIComponent(id)}`, json('PATCH', { read: true })); },
  async deleteNotification(id) { return apiRequest(`notifications/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
  async clearNotifications() { return apiRequest('notifications/clear/all', { method: 'DELETE' }); },

  // --- Inquiries (public contact form + superuser inbox) ---
  async getInquiries() { return asList(await apiRequest('inquiries')); },
  async createInquiry(payload) { return apiRequest('inquiries', json('POST', payload)); },
  async updateInquiry(id, changes) { return apiRequest(`inquiries/${encodeURIComponent(id)}`, json('PATCH', changes)); },
  async deleteInquiry(id) { return apiRequest(`inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
};
