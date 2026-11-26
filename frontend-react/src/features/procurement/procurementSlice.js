import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, qs, json } from '../../store/helpers';

/**
 * Materials: request (site engineer) -> approval (PM) -> purchase order (storekeeper, FM approves above the limit)
 * -> goods receipt -> site stock -> issue to an engineer.
 * One slice, one normalised list per record type.
 */
const requestsAdapter = createEntityAdapter({ sortComparer: (a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }) });
const ordersAdapter = createEntityAdapter({ sortComparer: (a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }) });
const suppliersAdapter = createEntityAdapter({ sortComparer: (a, b) => String(a.name).localeCompare(String(b.name)) });

const enc = encodeURIComponent;

// material requests
export const fetchMaterialRequests = apiThunk('procurement/fetchRequests', (params = {}) => apiRequest(`material-requests${qs(params)}`));
export const createMaterialRequest = apiThunk('procurement/createRequest', (data) => apiRequest('material-requests', json('POST', data)));
export const cancelMaterialRequest = apiThunk('procurement/cancelRequest', (id) => apiRequest(`material-requests/${enc(id)}/cancel`, { method: 'POST' }));
export const approveMaterialRequest = apiThunk('procurement/approveRequest', ({ id, note }) => apiRequest(`material-requests/${enc(id)}/approve`, json('POST', { note })));
export const rejectMaterialRequest = apiThunk('procurement/rejectRequest', ({ id, note }) => apiRequest(`material-requests/${enc(id)}/reject`, json('POST', { note })));

// purchase orders
export const fetchPurchaseOrders = apiThunk('procurement/fetchOrders', (params = {}) => apiRequest(`purchase-orders${qs(params)}`));
export const fetchPurchaseOrder = apiThunk('procurement/fetchOrder', (id) => apiRequest(`purchase-orders/${enc(id)}`));
export const createPurchaseOrder = apiThunk('procurement/createOrder', async (data, { dispatch }) => {
  const res = await apiRequest('purchase-orders', json('POST', data));
  if (!res?.error) dispatch(fetchMaterialRequests()); // the request becomes (partly) ordered
  return res;
});
export const approvePurchaseOrder = apiThunk('procurement/approveOrder', ({ id, note }) => apiRequest(`purchase-orders/${enc(id)}/approve`, json('POST', { note })));
export const rejectPurchaseOrder = apiThunk('procurement/rejectOrder', ({ id, note }) => apiRequest(`purchase-orders/${enc(id)}/reject`, json('POST', { note })));
export const cancelPurchaseOrder = apiThunk('procurement/cancelOrder', ({ id, reason }) => apiRequest(`purchase-orders/${enc(id)}/cancel`, json('POST', { reason })));

// deliveries
export const fetchGoodsReceipts = apiThunk('procurement/fetchReceipts', (poId) => apiRequest(`goods-receipts${qs({ poId })}`));
/** Record a delivery. The answer holds the receipt and the updated order; stock is re-read afterwards. */
export const createGoodsReceipt = apiThunk('procurement/createReceipt', async (data, { dispatch }) => {
  const res = await apiRequest('goods-receipts', json('POST', data));
  if (!res?.error) dispatch(fetchStock());
  return res;
});
export const uploadGrnInvoice = apiThunk('procurement/uploadInvoice', ({ grnId, file }) => {
  const form = new FormData();
  form.append('invoice', file);
  return apiRequest(`goods-receipts/${enc(grnId)}/invoice`, { method: 'POST', body: form });
});

// site stock
export const fetchStock = apiThunk('procurement/fetchStock', (projectId) => apiRequest(`stock${qs({ projectId })}`));
export const fetchStockLedger = apiThunk('procurement/fetchLedger', (projectId) => apiRequest(`stock/ledger${qs({ projectId })}`));
export const fetchMaterialIssues = apiThunk('procurement/fetchIssues', (projectId) => apiRequest(`stock/issues${qs({ projectId })}`));
export const createMaterialIssue = apiThunk('procurement/createIssue', async (data, { dispatch }) => {
  const res = await apiRequest('stock/issues', json('POST', data));
  if (!res?.error) dispatch(fetchStock());
  return res;
});

// suppliers and settings
export const fetchSuppliers = apiThunk('procurement/fetchSuppliers', () => apiRequest('suppliers'));
export const createSupplier = apiThunk('procurement/createSupplier', (data) => apiRequest('suppliers', json('POST', data)));
export const updateSupplier = apiThunk('procurement/updateSupplier', ({ id, changes }) => apiRequest(`suppliers/${enc(id)}`, json('PATCH', changes)));
export const deleteSupplier = apiThunk('procurement/deleteSupplier', (id) => apiRequest(`suppliers/${enc(id)}`, { method: 'DELETE' }));
export const fetchProcurementSettings = apiThunk('procurement/fetchSettings', () => apiRequest('procurement/settings'));
export const updateProcurementSettings = apiThunk('procurement/updateSettings', (poApprovalLimit) =>
  apiRequest('procurement/settings', json('PATCH', { poApprovalLimit })));

const procurementSlice = createSlice({
  name: 'procurement',
  initialState: {
    requests: requestsAdapter.getInitialState({ status: 'idle', error: null }),
    orders: ordersAdapter.getInitialState({ status: 'idle', error: null }),
    suppliers: suppliersAdapter.getInitialState({ status: 'idle', error: null }),
    receiptsByOrder: {},
    stock: [],
    ledger: [],
    issues: [],
    stockStatus: 'idle',
    stockError: null,
    settings: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    const list = (thunk, key, adapter) => builder
      .addCase(thunk.pending, (s) => { s[key].status = 'loading'; s[key].error = null; })
      .addCase(thunk.fulfilled, (s, a) => { s[key].status = 'succeeded'; adapter.setAll(s[key], Array.isArray(a.payload) ? a.payload : []); })
      .addCase(thunk.rejected, (s, a) => { s[key].status = 'failed'; s[key].error = a.payload || a.error.message; });
    const upsert = (thunks, key, adapter, pick = (p) => p) => thunks.forEach((t) => builder.addCase(t.fulfilled, (s, a) => {
      const rec = pick(a.payload);
      if (rec && rec.id !== undefined) adapter.upsertOne(s[key], rec);
    }));

    list(fetchMaterialRequests, 'requests', requestsAdapter);
    upsert([createMaterialRequest, cancelMaterialRequest, approveMaterialRequest, rejectMaterialRequest], 'requests', requestsAdapter);
    list(fetchPurchaseOrders, 'orders', ordersAdapter);
    upsert([fetchPurchaseOrder, createPurchaseOrder, approvePurchaseOrder, rejectPurchaseOrder, cancelPurchaseOrder], 'orders', ordersAdapter);
    upsert([createGoodsReceipt], 'orders', ordersAdapter, (p) => p?.order);
    list(fetchSuppliers, 'suppliers', suppliersAdapter);
    upsert([createSupplier, updateSupplier], 'suppliers', suppliersAdapter);

    builder
      .addCase(deleteSupplier.fulfilled, (s, a) => { suppliersAdapter.removeOne(s.suppliers, a.meta.arg); })
      .addCase(fetchGoodsReceipts.fulfilled, (s, a) => { s.receiptsByOrder[a.meta.arg || 'all'] = Array.isArray(a.payload) ? a.payload : []; })
      .addCase(fetchStock.pending, (s) => { s.stockStatus = 'loading'; s.stockError = null; })
      .addCase(fetchStock.fulfilled, (s, a) => { s.stockStatus = 'succeeded'; s.stock = Array.isArray(a.payload) ? a.payload : []; })
      .addCase(fetchStock.rejected, (s, a) => { s.stockStatus = 'failed'; s.stockError = a.payload || a.error.message; })
      .addCase(fetchStockLedger.fulfilled, (s, a) => { s.ledger = Array.isArray(a.payload) ? a.payload : []; })
      .addCase(fetchMaterialIssues.fulfilled, (s, a) => { s.issues = Array.isArray(a.payload) ? a.payload : []; })
      .addCase(createMaterialIssue.fulfilled, (s, a) => { if (a.payload?.id) s.issues = [a.payload, ...s.issues]; })
      .addCase(fetchProcurementSettings.fulfilled, (s, a) => { s.settings = a.payload; })
      .addCase(updateProcurementSettings.fulfilled, (s, a) => { s.settings = a.payload; })
      // the order itself is upserted above; a matcher adds the new delivery to that order's receipt list
      .addMatcher(createGoodsReceipt.fulfilled.match, (s, a) => {
        const poId = a.payload?.order?.id;
        if (poId && a.payload.receipt) s.receiptsByOrder[poId] = [a.payload.receipt, ...(s.receiptsByOrder[poId] || [])];
      });
  },
});

export default procurementSlice.reducer;

export const { selectAll: selectAllMaterialRequests, selectById: selectMaterialRequestById } =
  requestsAdapter.getSelectors((state) => state.procurement.requests);
export const { selectAll: selectAllPurchaseOrders, selectById: selectPurchaseOrderById } =
  ordersAdapter.getSelectors((state) => state.procurement.orders);
export const { selectAll: selectAllSuppliers } = suppliersAdapter.getSelectors((state) => state.procurement.suppliers);

export const selectMaterialRequestsStatus = (state) => state.procurement.requests.status;
export const selectPurchaseOrdersStatus = (state) => state.procurement.orders.status;
export const selectSuppliersStatus = (state) => state.procurement.suppliers.status;
export const selectStock = (state) => state.procurement.stock;
export const selectStockStatus = (state) => state.procurement.stockStatus;
export const selectStockLedger = (state) => state.procurement.ledger;
export const selectMaterialIssues = (state) => state.procurement.issues;
export const selectProcurementSettings = (state) => state.procurement.settings;
const NONE = Object.freeze([]);
export const selectReceiptsOfOrder = (state, poId) => state.procurement.receiptsByOrder[poId] || NONE;

export const selectActiveSuppliers = createSelector([selectAllSuppliers], (list) => list.filter((s) => s.status === 'active'));
export const selectOrdersAwaitingApproval = createSelector([selectAllPurchaseOrders], (list) =>
  list.filter((o) => o.status === 'pending_approval'));
