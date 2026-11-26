// @vitest-environment jsdom
/**
 * Unit tests of the Redux layer: reducers, selectors, thunks (with a mocked fetch) and the listener middleware.
 * They need no backend:  cd frontend-react && npx vitest run tests/store
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeStore } from '../../src/store';
import { apiThunk } from '../../src/store/helpers';
import { isFirstLoad, errorText } from '../../src/store/hooks';
import { currentUserUpdated, logoutUser, selectCurrentUser, selectIsAuthenticated } from '../../src/features/auth/authSlice';
import { toastAdded, toastRemoved, showToast, selectToasts } from '../../src/features/ui/uiSlice';
import {
  fetchProjects, updateProject, deleteProject, selectAllProjects, selectProjectById, selectProjectsStatus, selectProjectsError,
  selectProjectsManagedBy, selectProjectsFinancedBy, selectProjectsOfClient, selectSiteWorkProjects, selectProjectAllowed,
  projectDisplayStatus,
} from '../../src/features/projects/projectsSlice';
import { fetchTasks, selectOpenWorkProjectIds, selectTasksByProject, isTaskOpen } from '../../src/features/tasks/tasksSlice';
import { fetchBills, payBill, createBill, fetchBillableSheet, selectBilledToDate, selectBillPayments, selectBillById, billDecision } from '../../src/features/bills/billsSlice';
import { fetchProjectProgress, selectProgressEntry } from '../../src/features/milestones/milestonesSlice';
import { fetchRequirementQuotations, selectQuotationsOfRequirement } from '../../src/features/marketplace/marketplaceSlice';
import { fetchExpenseClaims, verifyExpense, selectExpenseById, selectExpensesByStatus } from '../../src/features/expenses/expensesSlice';
import { markNotificationRead, fetchNotifications, selectUnreadCount } from '../../src/features/notifications/notificationsSlice';

/** fetch that answers each call with the next queued [status, body]. */
function mockFetch(...answers) {
  const queue = [...answers];
  const fn = vi.fn(async () => {
    const [status, body] = queue.shift() || [200, null];
    return { ok: status < 400, status, json: async () => body };
  });
  globalThis.fetch = fn;
  return fn;
}

const PROJECTS = [
  { id: 'P1', name: 'Tower', status: 'On Track', managerId: 'PM', financeManagerId: 'FM', clientId: 'C1', displayStatus: 'Delayed', allowed: { canDoSiteWork: true, canDelete: false } },
  { id: 'P2', name: 'Villa', status: 'Awaiting Advance', managerId: 'PM2', financeManagerId: 'FM', clientId: 'C2', allowed: { canDoSiteWork: false } },
];

let store;
beforeEach(() => {
  sessionStorage.clear();
  store = makeStore();
});
afterEach(() => vi.restoreAllMocks());

describe('auth slice', () => {
  test('starts from the tab session and stays signed out without one', () => {
    expect(selectCurrentUser(store.getState())).toBeNull();
    expect(selectIsAuthenticated(store.getState())).toBe(false);
    sessionStorage.setItem('ch_token', 't');
    sessionStorage.setItem('ch_user', JSON.stringify({ id: 'U1', name: 'Asha' }));
    const signedIn = makeStore();
    expect(selectIsAuthenticated(signedIn.getState())).toBe(true);
    expect(selectCurrentUser(signedIn.getState()).name).toBe('Asha');
  });

  test('profile edits update the store and the listener saves them to the session', () => {
    sessionStorage.setItem('ch_token', 't');
    sessionStorage.setItem('ch_user', JSON.stringify({ id: 'U1', name: 'Asha' }));
    const s = makeStore();
    s.dispatch(currentUserUpdated({ name: 'Asha Rao', phone: '9876543210' }));
    expect(selectCurrentUser(s.getState())).toMatchObject({ id: 'U1', name: 'Asha Rao', phone: '9876543210' });
    expect(JSON.parse(sessionStorage.getItem('ch_user')).name).toBe('Asha Rao');
  });

  test('signing out empties every slice', () => {
    store.dispatch(fetchProjects.fulfilled(PROJECTS, 'r1'));
    expect(selectAllProjects(store.getState())).toHaveLength(2);
    store.dispatch({ type: logoutUser.fulfilled.type });
    expect(selectAllProjects(store.getState())).toHaveLength(0);
    expect(selectCurrentUser(store.getState())).toBeNull();
  });
});

describe('ui slice (toasts)', () => {
  test('prepare callback gives each toast an id; toasts can be removed', () => {
    store.dispatch(toastAdded({ message: 'Saved', type: 'success' }));
    const [toast] = selectToasts(store.getState());
    expect(toast).toMatchObject({ message: 'Saved', type: 'success' });
    expect(typeof toast.id).toBe('string');
    store.dispatch(toastRemoved(toast.id));
    expect(selectToasts(store.getState())).toHaveLength(0);
  });

  test('showToast thunk removes the toast after its duration', () => {
    vi.useFakeTimers();
    store.dispatch(showToast('Hello', 'info', 1000));
    expect(selectToasts(store.getState())).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(selectToasts(store.getState())).toHaveLength(0);
    vi.useRealTimers();
  });
});

describe('projects slice', () => {
  test('fetchProjects: pending -> succeeded with a normalised list', async () => {
    mockFetch([200, PROJECTS]);
    const pending = store.dispatch(fetchProjects());
    expect(selectProjectsStatus(store.getState())).toBe('loading');
    await pending;
    expect(selectProjectsStatus(store.getState())).toBe('succeeded');
    expect(store.getState().projects.ids).toEqual(['P1', 'P2']);
    expect(selectProjectById(store.getState(), 'P2').name).toBe('Villa');
  });

  test('a refused request becomes a rejected action carrying the server message', async () => {
    mockFetch([403, { message: 'Access denied.' }]);
    const action = await store.dispatch(fetchProjects());
    expect(fetchProjects.rejected.match(action)).toBe(true);
    expect(action.payload).toBe('Access denied.');
    expect(selectProjectsStatus(store.getState())).toBe('failed');
    expect(selectProjectsError(store.getState())).toBe('Access denied.');
  });

  test('update upserts, delete removes, unwrap() throws the message', async () => {
    store.dispatch(fetchProjects.fulfilled(PROJECTS, 'r1'));
    mockFetch([200, { ...PROJECTS[0], name: 'Tower A' }], [409, { message: 'Project has bills.' }], [200, { deleted: true }]);
    await store.dispatch(updateProject({ id: 'P1', changes: { name: 'Tower A' } }));
    expect(selectProjectById(store.getState(), 'P1').name).toBe('Tower A');
    await expect(store.dispatch(deleteProject('P1')).unwrap()).rejects.toBe('Project has bills.');
    expect(selectProjectById(store.getState(), 'P1')).toBeTruthy();
    await store.dispatch(deleteProject('P2'));
    expect(selectProjectById(store.getState(), 'P2')).toBeUndefined();
  });

  test('role selectors and server flags', () => {
    store.dispatch(fetchProjects.fulfilled(PROJECTS, 'r1'));
    const s = store.getState();
    expect(selectProjectsManagedBy(s, 'PM').map((p) => p.id)).toEqual(['P1']);
    expect(selectProjectsFinancedBy(s, 'FM')).toHaveLength(2);
    expect(selectProjectsOfClient(s, 'C2').map((p) => p.id)).toEqual(['P2']);
    expect(selectSiteWorkProjects(s).map((p) => p.id)).toEqual(['P1']);
    expect(selectProjectAllowed(s, 'P1').canDelete).toBe(false);
    expect(selectProjectAllowed(s, 'missing')).toEqual({});
    // memoised: the same inputs give the same array object (no needless re-render)
    expect(selectProjectsManagedBy(s, 'PM')).toBe(selectProjectsManagedBy(s, 'PM'));
  });

  test('display status: the server flag wins, the milestone count is a fallback', () => {
    expect(projectDisplayStatus(PROJECTS[0])).toBe('Delayed');
    expect(projectDisplayStatus({ status: 'On Track' }, 2)).toBe('Delayed');
    expect(projectDisplayStatus({ status: 'Completed' }, 2)).toBe('Completed');
    expect(projectDisplayStatus(null)).toBe('');
  });
});

describe('tasks slice', () => {
  test('open work per engineer drives where they may log site work', () => {
    store.dispatch(fetchTasks.fulfilled([
      { id: 'T1', projectId: 'P1', assignedTo: 'SE', status: 'In Progress' },
      { id: 'T2', projectId: 'P2', assignedTo: 'SE', status: 'Completed' },
      { id: 'T3', projectId: 'P3', assignedTo: 'OTHER', status: 'Pending' },
    ], 'r1'));
    expect([...selectOpenWorkProjectIds(store.getState(), 'SE')]).toEqual(['P1']);
    expect(selectTasksByProject(store.getState(), 'P2').map((t) => t.id)).toEqual(['T2']);
    expect(isTaskOpen({ status: 'Completed' })).toBe(false);
  });
});

describe('bills slice', () => {
  const BILLS = [
    { id: 'B1', projectId: 'P1', amount: 100, status: 'Accepted', paidAmount: 0 },
    { id: 'B2', projectId: 'P1', amount: 50, status: 'Declined' },
    { id: 'B3', projectId: 'P1', amount: 25, status: 'Pending Decision' },
  ];

  test('billed-to-date leaves out declined bills', () => {
    store.dispatch(fetchBills.fulfilled(BILLS, 'r1'));
    expect(selectBilledToDate(store.getState(), 'P1')).toBe(125);
    expect(billDecision('rejected')).toBe('Declined');
  });

  test('a payment refreshes the bill and is added to its history', () => {
    store.dispatch(fetchBills.fulfilled(BILLS, 'r1'));
    const arg = { billId: 'B1', payment: { amount: 40 } };
    store.dispatch(payBill.fulfilled({ bill: { ...BILLS[0], paidAmount: 40, outstanding: 60 }, payment: { id: 'PAY1', amount: 40 } }, 'r2', arg));
    expect(selectBillById(store.getState(), 'B1').outstanding).toBe(60);
    expect(selectBillPayments(store.getState(), 'B1').map((p) => p.id)).toEqual(['PAY1']);
    expect(selectBillPayments(store.getState(), 'NONE')).toEqual([]);
  });

  test('creating a bill forgets that project\'s billing sheet (it is out of date)', () => {
    store.dispatch(fetchBillableSheet.fulfilled({ milestones: [] }, 'r1', 'P1'));
    expect(store.getState().bills.billableByProject.P1).toBeTruthy();
    store.dispatch(createBill.fulfilled({ id: 'B9', projectId: 'P1', amount: 10 }, 'r2', {}));
    expect(store.getState().bills.billableByProject.P1).toBeUndefined();
    expect(selectBillById(store.getState(), 'B9')).toBeTruthy();
  });
});

describe('milestones, marketplace, expenses, notifications', () => {
  test('progress is kept per project with its own request status', () => {
    store.dispatch(fetchProjectProgress.pending('r1', 'P1'));
    expect(selectProgressEntry(store.getState(), 'P1').status).toBe('loading');
    store.dispatch(fetchProjectProgress.fulfilled({ physicalProgress: 40 }, 'r1', 'P1'));
    expect(selectProgressEntry(store.getState(), 'P1')).toMatchObject({ status: 'succeeded', data: { physicalProgress: 40 } });
    expect(selectProgressEntry(store.getState(), 'P9').status).toBe('idle');
  });

  test('quotations of a requirement come cheapest first', () => {
    store.dispatch(fetchRequirementQuotations.fulfilled([
      { id: 'Q1', requirementId: 'R1', totalAmount: 500 },
      { id: 'Q2', requirementId: 'R1', totalAmount: 300 },
      { id: 'Q3', requirementId: 'R2', totalAmount: 100 },
    ], 'r1', 'R1'));
    expect(selectQuotationsOfRequirement(store.getState(), 'R1').map((q) => q.id)).toEqual(['Q2', 'Q1']);
  });

  test('a workflow step upserts the claim, so lists by status move it', () => {
    store.dispatch(fetchExpenseClaims.fulfilled([{ id: 'E1', status: 'submitted' }], 'r1'));
    expect(selectExpensesByStatus(store.getState(), 'submitted')).toHaveLength(1);
    store.dispatch(verifyExpense.fulfilled({ id: 'E1', status: 'pm_verified' }, 'r2', { id: 'E1' }));
    expect(selectExpenseById(store.getState(), 'E1').status).toBe('pm_verified');
    expect(selectExpensesByStatus(store.getState(), 'submitted')).toHaveLength(0);
  });

  test('marking a notification read updates the unread count at once (optimistic)', () => {
    store.dispatch(fetchNotifications.fulfilled([{ id: 'N1', read: false }, { id: 'N2', read: false }], 'r1'));
    expect(selectUnreadCount(store.getState())).toBe(2);
    store.dispatch(markNotificationRead.pending('r2', 'N1'));
    expect(selectUnreadCount(store.getState())).toBe(1);
  });
});

describe('helpers', () => {
  test('apiThunk joins validation message arrays', async () => {
    const t = apiThunk('test/x', async () => ({ error: true, message: ['name is too short', 'email is invalid'] }));
    const action = await store.dispatch(t());
    expect(action.payload).toBe('name is too short, email is invalid');
  });

  test('isFirstLoad and errorText', () => {
    expect(isFirstLoad('idle', false)).toBe(true);
    expect(isFirstLoad('loading', true)).toBe(false); // a refresh of data already on screen
    expect(isFirstLoad('succeeded', false)).toBe(false);
    expect(errorText('Nope')).toBe('Nope');
    expect(errorText(new Error('Boom'))).toBe('Boom');
    expect(errorText(undefined, 'Fallback')).toBe('Fallback');
  });
});
