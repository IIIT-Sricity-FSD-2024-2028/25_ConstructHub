/**
 * Direct HTTP calls the UI tests use to set up data and to check what the server stored, without going through a
 * screen. The app itself never calls these: its screens dispatch Redux thunks. Same `apiRequest` underneath.
 */
import { api as session, apiRequest } from '../src/services/api';

const enc = encodeURIComponent;
const post = (body) => ({ method: 'POST', body: JSON.stringify(body) });
const patch = (body) => ({ method: 'PATCH', body: JSON.stringify(body) });
const qs = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString();
  return s ? `?${s}` : '';
};

export const api = {
  login: session.login,
  getCurrentUser: session.getCurrentUser,

  getProjects: () => apiRequest('projects'),
  createProject: (data) => apiRequest('projects', post(data)),
  getTasks: () => apiRequest('tasks'),
  updateTask: (id, changes) => apiRequest(`tasks/${enc(id)}`, patch(changes)),
  getBills: () => apiRequest('bills'),
  getBillPayments: (billId) => apiRequest(`bills/${enc(billId)}/payments`),
  getDashboard: () => apiRequest('dashboard'),
  createReport: (data) => apiRequest('reports', post(data)),

  getProjectProgress: (projectId) => apiRequest(`milestones/progress/${enc(projectId)}`),
  createMilestone: (data) => apiRequest('milestones', post(data)),
  updateMilestone: (id, changes) => apiRequest(`milestones/${enc(id)}`, patch(changes)),
  approveMilestone: (id) => apiRequest(`milestones/${enc(id)}/approve`, { method: 'POST' }),

  getExpenseClaims: (params) => apiRequest(`expenses${qs(params)}`),
  getExpenseClaim: (id) => apiRequest(`expenses/${enc(id)}`),

  getMaterialRequests: (params) => apiRequest(`material-requests${qs(params)}`),
  getPurchaseOrders: (params) => apiRequest(`purchase-orders${qs(params)}`),
  getPurchaseOrder: (id) => apiRequest(`purchase-orders/${enc(id)}`),
  createGoodsReceipt: (data) => apiRequest('goods-receipts', post(data)),
  getStock: (projectId) => apiRequest(`stock${qs({ projectId })}`),
  getProcurementSettings: () => apiRequest('procurement/settings'),

  getRequirements: (params) => apiRequest(`requirements${qs(params)}`),
  assignEstimateTeam: (requirementId, data) => apiRequest(`requirements/${enc(requirementId)}/assign-team`, post(data)),
  submitPmEstimate: (id, data) => apiRequest(`quotations/${enc(id)}/pm-estimate`, patch(data)),
  submitFmEstimate: (id, data) => apiRequest(`quotations/${enc(id)}/fm-estimate`, patch(data)),
  releaseQuotation: (id, data) => apiRequest(`quotations/${enc(id)}/release`, post(data)),
};
