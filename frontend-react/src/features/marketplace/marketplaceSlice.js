import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, qs, json } from '../../store/helpers';

/**
 * Marketplace: a client posts a requirement, a company prices it (admin assigns PM + FM, PM plans stages, FM costs
 * them, admin adds markup and releases the quotation), the client compares quotations and awards one.
 */
const byNewest = (a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
const requirementsAdapter = createEntityAdapter({ sortComparer: byNewest });
const quotationsAdapter = createEntityAdapter({ sortComparer: byNewest });
const contractsAdapter = createEntityAdapter({ sortComparer: byNewest });
const enc = encodeURIComponent;

export const fetchRequirements = apiThunk('marketplace/fetchRequirements', (params = {}) => apiRequest(`requirements${qs(params)}`));
export const fetchRequirement = apiThunk('marketplace/fetchRequirement', (id) => apiRequest(`requirements/${enc(id)}`));
export const createRequirement = apiThunk('marketplace/createRequirement', (data) => apiRequest('requirements', json('POST', data)));
export const updateRequirement = apiThunk('marketplace/updateRequirement', ({ id, changes }) => apiRequest(`requirements/${enc(id)}`, json('PATCH', changes)));
export const closeRequirement = apiThunk('marketplace/closeRequirement', (id) => apiRequest(`requirements/${enc(id)}/close`, { method: 'POST' }));
export const uploadRequirementDocuments = apiThunk('marketplace/uploadDocuments', ({ id, files }) => {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append('documents', f));
  return apiRequest(`requirements/${enc(id)}/documents`, { method: 'POST', body: form });
});

/** Quotations of one requirement (the client compares them; a company sees only its own). */
export const fetchRequirementQuotations = apiThunk('marketplace/fetchRequirementQuotations', (id) => apiRequest(`requirements/${enc(id)}/quotations`));
export const fetchQuotations = apiThunk('marketplace/fetchQuotations', () => apiRequest('quotations'));
export const fetchEstimates = apiThunk('marketplace/fetchEstimates', () => apiRequest('quotations/estimates'));
export const updateQuotation = apiThunk('marketplace/updateQuotation', ({ id, changes }) => apiRequest(`quotations/${enc(id)}`, json('PATCH', changes)));
export const withdrawQuotation = apiThunk('marketplace/withdrawQuotation', (id) => apiRequest(`quotations/${enc(id)}/withdraw`, { method: 'POST' }));
export const rejectQuotation = apiThunk('marketplace/rejectQuotation', ({ id, reason }) => apiRequest(`quotations/${enc(id)}/reject`, json('POST', { reason })));
export const assignEstimateTeam = apiThunk('marketplace/assignTeam', ({ requirementId, pmId, fmId }) =>
  apiRequest(`requirements/${enc(requirementId)}/assign-team`, json('POST', { pmId, fmId })));
export const submitPmEstimate = apiThunk('marketplace/pmEstimate', ({ id, data }) => apiRequest(`quotations/${enc(id)}/pm-estimate`, json('PATCH', data)));
export const submitFmEstimate = apiThunk('marketplace/fmEstimate', ({ id, data }) => apiRequest(`quotations/${enc(id)}/fm-estimate`, json('PATCH', data)));
export const releaseQuotation = apiThunk('marketplace/releaseQuotation', ({ id, data }) => apiRequest(`quotations/${enc(id)}/release`, json('POST', data)));
/** The client awards a quotation: the server creates the project, the contract and Bill #1 in one go. */
export const acceptQuotation = apiThunk('marketplace/acceptQuotation', (id) => apiRequest(`quotations/${enc(id)}/accept`, { method: 'POST' }));
export const fetchContracts = apiThunk('marketplace/fetchContracts', () => apiRequest('contracts'));

const QUOTE_UPDATES = [updateQuotation, withdrawQuotation, rejectQuotation, assignEstimateTeam, submitPmEstimate, submitFmEstimate, releaseQuotation];

const marketplaceSlice = createSlice({
  name: 'marketplace',
  initialState: {
    requirements: requirementsAdapter.getInitialState({ status: 'idle', error: null }),
    quotations: quotationsAdapter.getInitialState({ status: 'idle', error: null }),
    estimates: quotationsAdapter.getInitialState({ status: 'idle', error: null }),
    contracts: contractsAdapter.getInitialState({ status: 'idle', error: null }),
  },
  reducers: {},
  extraReducers: (builder) => {
    const list = (thunk, key, adapter, merge = false) => builder
      .addCase(thunk.pending, (s) => { s[key].status = 'loading'; s[key].error = null; })
      .addCase(thunk.fulfilled, (s, a) => {
        s[key].status = 'succeeded';
        const rows = Array.isArray(a.payload) ? a.payload : [];
        if (merge) adapter.upsertMany(s[key], rows); else adapter.setAll(s[key], rows);
      })
      .addCase(thunk.rejected, (s, a) => { s[key].status = 'failed'; s[key].error = a.payload || a.error.message; });

    list(fetchRequirements, 'requirements', requirementsAdapter);
    list(fetchQuotations, 'quotations', quotationsAdapter);
    list(fetchRequirementQuotations, 'quotations', quotationsAdapter, true);
    list(fetchEstimates, 'estimates', quotationsAdapter);
    list(fetchContracts, 'contracts', contractsAdapter);

    [fetchRequirement, createRequirement, updateRequirement, closeRequirement, uploadRequirementDocuments].forEach((t) =>
      builder.addCase(t.fulfilled, (s, a) => { if (a.payload?.id) requirementsAdapter.upsertOne(s.requirements, a.payload); }));
    QUOTE_UPDATES.forEach((t) => builder.addCase(t.fulfilled, (s, a) => {
      if (!a.payload?.id) return;
      quotationsAdapter.upsertOne(s.quotations, a.payload);
      if (s.estimates.entities[a.payload.id] || t === assignEstimateTeam) quotationsAdapter.upsertOne(s.estimates, a.payload);
    }));
    builder.addCase(acceptQuotation.fulfilled, (s, a) => {
      const { requirement, contract, quotation } = a.payload || {};
      if (requirement?.id) requirementsAdapter.upsertOne(s.requirements, requirement);
      if (contract?.id) contractsAdapter.upsertOne(s.contracts, contract);
      if (quotation?.id) quotationsAdapter.upsertOne(s.quotations, quotation);
    });
  },
});

export default marketplaceSlice.reducer;

export const { selectAll: selectAllRequirements, selectById: selectRequirementById } =
  requirementsAdapter.getSelectors((state) => state.marketplace.requirements);
export const { selectAll: selectAllQuotations } = quotationsAdapter.getSelectors((state) => state.marketplace.quotations);
export const { selectAll: selectAllEstimates } = quotationsAdapter.getSelectors((state) => state.marketplace.estimates);
export const { selectAll: selectAllContracts } = contractsAdapter.getSelectors((state) => state.marketplace.contracts);

export const selectRequirementsStatus = (state) => state.marketplace.requirements.status;
export const selectQuotationsStatus = (state) => state.marketplace.quotations.status;
export const selectEstimatesStatus = (state) => state.marketplace.estimates.status;

/** Quotations received for one requirement, cheapest first (the order the client compares them in). */
export const selectQuotationsOfRequirement = createSelector(
  [selectAllQuotations, (_state, requirementId) => requirementId],
  (quotes, requirementId) => quotes
    .filter((q) => q.requirementId === requirementId)
    .sort((a, b) => (Number(a.totalAmount) || 0) - (Number(b.totalAmount) || 0)),
);
