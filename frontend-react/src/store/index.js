import { configureStore, combineReducers, createListenerMiddleware } from '@reduxjs/toolkit';
import { api } from '../services/api';
import authReducer, { currentUserUpdated, logoutUser } from '../features/auth/authSlice';
import uiReducer from '../features/ui/uiSlice';
import projectsReducer from '../features/projects/projectsSlice';
import usersReducer from '../features/users/usersSlice';
import tasksReducer from '../features/tasks/tasksSlice';
import milestonesReducer from '../features/milestones/milestonesSlice';
import reportsReducer from '../features/reports/reportsSlice';
import billsReducer from '../features/bills/billsSlice';
import expensesReducer from '../features/expenses/expensesSlice';
import procurementReducer from '../features/procurement/procurementSlice';
import marketplaceReducer from '../features/marketplace/marketplaceSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import messagesReducer from '../features/messages/messagesSlice';
import platformReducer from '../features/platform/platformSlice';
import financeReducer from '../features/finance/financeSlice';

/**
 * Redux store of ConstructHub.
 *
 *   auth / ui            who is signed in, toast messages
 *   projects ... finance one slice per business area; server data normalised with entity adapters
 *
 * Shared and server data lives here; form inputs and open/closed dialogs stay in each component's own state.
 */
const appReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  projects: projectsReducer,
  users: usersReducer,
  tasks: tasksReducer,
  milestones: milestonesReducer,
  reports: reportsReducer,
  bills: billsReducer,
  expenses: expensesReducer,
  procurement: procurementReducer,
  marketplace: marketplaceReducer,
  notifications: notificationsReducer,
  messages: messagesReducer,
  platform: platformReducer,
  finance: financeReducer,
});

/** Signing out empties every slice, so nothing of the previous user remains in memory. */
export const rootReducer = (state, action) => {
  if (action.type === logoutUser.fulfilled.type) return appReducer(undefined, action);
  return appReducer(state, action);
};

/** Side effects that follow actions: keep the tab's saved session in step with profile edits. */
const listener = createListenerMiddleware();
listener.startListening({
  actionCreator: currentUserUpdated,
  effect: (_action, api2) => {
    const user = api2.getState().auth.user;
    if (user) api.setCurrentUser(user);
  },
});

/** Store factory: the app makes one; tests make a fresh one per test (it reads the tab's session when created). */
export function makeStore(preloadedState) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) => getDefault().prepend(listener.middleware),
    devTools: import.meta.env?.MODE !== 'production',
  });
}
