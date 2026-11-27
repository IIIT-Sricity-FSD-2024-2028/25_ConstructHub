import { createSlice, createEntityAdapter } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, json } from '../../store/helpers';

/**
 * Company and platform data: companies (approval, plan, overage), subscription plans, a company's own
 * subscription, and the contact-form inquiries the platform admin works through.
 */
const companiesAdapter = createEntityAdapter({ sortComparer: (a, b) => String(a.name).localeCompare(String(b.name)) });
const inquiriesAdapter = createEntityAdapter({ sortComparer: (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) });
const enc = encodeURIComponent;

export const fetchCompanies = apiThunk('platform/fetchCompanies', () => apiRequest('companies'));
export const fetchCompany = apiThunk('platform/fetchCompany', (id) => apiRequest(`companies/${enc(id)}`));
export const updateCompany = apiThunk('platform/updateCompany', ({ id, changes }) => apiRequest(`companies/${enc(id)}`, json('PATCH', changes)));
export const toggleOverage = apiThunk('platform/toggleOverage', ({ id, payload }) => apiRequest(`companies/${enc(id)}/overage`, json('PATCH', payload)));
export const setCompanyApproval = apiThunk('platform/setCompanyApproval', ({ id, decision, reason }) =>
  apiRequest(`companies/${enc(id)}/approval`, json('PATCH', { decision, reason })));
export const onboardCompany = apiThunk('platform/onboardCompany', (payload) => apiRequest('companies/onboard', json('POST', payload)));
export const fetchCompanySubscription = apiThunk('platform/fetchSubscription', (id) => apiRequest(`companies/${enc(id)}/subscription`));

export const fetchPlans = apiThunk('platform/fetchPlans', () => apiRequest('plans'));
export const updatePlan = apiThunk('platform/updatePlan', ({ name, changes }) => apiRequest(`plans/${enc(name)}`, json('PATCH', changes)));
export const updateOverageRates = apiThunk('platform/updateOverageRates', (changes) => apiRequest('plans/overage-rates', json('PATCH', changes)));

/** Platform revenue worked out by the server (billing cycle, live plan prices, real usage overage). */
export const fetchPlatformRevenue = apiThunk('platform/fetchRevenue', () => apiRequest('companies/platform/revenue'));

export const fetchInquiries = apiThunk('platform/fetchInquiries', () => apiRequest('inquiries'));
/** Public contact form (no login needed). */
export const createInquiry = apiThunk('platform/createInquiry', (payload) => apiRequest('inquiries', json('POST', payload)));
export const updateInquiry = apiThunk('platform/updateInquiry', ({ id, changes }) => apiRequest(`inquiries/${enc(id)}`, json('PATCH', changes)));
export const deleteInquiry = apiThunk('platform/deleteInquiry', (id) => apiRequest(`inquiries/${enc(id)}`, { method: 'DELETE' }));

const platformSlice = createSlice({
  name: 'platform',
  initialState: {
    companies: companiesAdapter.getInitialState({ status: 'idle', error: null }),
    inquiries: inquiriesAdapter.getInitialState({ status: 'idle', error: null }),
    plans: null,
    revenue: null,
    subscriptions: {},
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanies.pending, (s) => { s.companies.status = 'loading'; })
      .addCase(fetchCompanies.fulfilled, (s, a) => { s.companies.status = 'succeeded'; companiesAdapter.setAll(s.companies, Array.isArray(a.payload) ? a.payload : []); })
      .addCase(fetchCompanies.rejected, (s, a) => { s.companies.status = 'failed'; s.companies.error = a.payload || a.error.message; })
      .addCase(fetchInquiries.pending, (s) => { s.inquiries.status = 'loading'; })
      .addCase(fetchInquiries.fulfilled, (s, a) => { s.inquiries.status = 'succeeded'; inquiriesAdapter.setAll(s.inquiries, Array.isArray(a.payload) ? a.payload : []); })
      .addCase(fetchInquiries.rejected, (s, a) => { s.inquiries.status = 'failed'; s.inquiries.error = a.payload || a.error.message; })
      .addCase(updateInquiry.fulfilled, (s, a) => { if (a.payload?.id) inquiriesAdapter.upsertOne(s.inquiries, a.payload); })
      .addCase(deleteInquiry.fulfilled, (s, a) => { inquiriesAdapter.removeOne(s.inquiries, a.meta.arg); })
      .addCase(fetchPlatformRevenue.fulfilled, (s, a) => { s.revenue = a.payload; })
      .addCase(fetchPlans.fulfilled, (s, a) => { s.plans = a.payload; })
      .addCase(fetchCompanySubscription.fulfilled, (s, a) => { s.subscriptions[a.meta.arg] = a.payload; });
    [fetchCompany, updateCompany, toggleOverage, setCompanyApproval].forEach((t) => builder.addCase(t.fulfilled, (s, a) => {
      const company = a.payload?.company || a.payload;
      if (company?.id) companiesAdapter.upsertOne(s.companies, company);
    }));
  },
});

export default platformSlice.reducer;

export const { selectAll: selectAllCompanies, selectById: selectCompanyById } = companiesAdapter.getSelectors((state) => state.platform.companies);
export const { selectAll: selectAllInquiries } = inquiriesAdapter.getSelectors((state) => state.platform.inquiries);
export const selectCompaniesStatus = (state) => state.platform.companies.status;
export const selectPlansData = (state) => state.platform.plans;
export const selectSubscription = (state, companyId) => state.platform.subscriptions[companyId] || null;

export const selectPlatformRevenue = (state) => state.platform.revenue;
