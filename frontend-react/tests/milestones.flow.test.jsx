// @vitest-environment jsdom
/**
 * UI flow test for milestones & progress, run against the REAL backend (fresh data/db, http://localhost:3000).
 *   cd frontend-react && npm i --no-save vitest jsdom @testing-library/react @testing-library/dom
 *   npx vitest run tests/milestones.flow.test.jsx
 */
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import { api } from '../src/services/api';
import ProjectManagerMilestones from '../src/actors/project-manager/pages/ProjectManagerMilestones';
import ProjectManagerTasks from '../src/actors/project-manager/pages/ProjectManagerTasks';
import SiteEngineerMyTasks from '../src/actors/site-engineer/pages/SiteEngineerMyTasks';
import ClientProjectProgress from '../src/actors/client/pages/ClientProjectProgress';

// The real layout passes the signed-in user through the router outlet context.
function WithUser() {
  return <Outlet context={{ user: api.getCurrentUser() }} />;
}

function App({ at }) {
  return (
    <MemoryRouter initialEntries={[at]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<WithUser />}>
              <Route path="/pm/milestones" element={<ProjectManagerMilestones />} />
              <Route path="/pm/tasks" element={<ProjectManagerTasks />} />
              <Route path="/se/tasks" element={<SiteEngineerMyTasks />} />
              <Route path="/client/progress" element={<ClientProjectProgress />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const signInAs = async (email, password = '123456') => {
  sessionStorage.clear();
  localStorage.clear();
  const res = await api.login(email, password);
  expect(res.success, JSON.stringify(res)).toBe(true);
};
const find = (re) => screen.findAllByText(re, {}, { timeout: 8000 });

afterEach(() => cleanup());

describe('milestones & progress UI', () => {
  test('PM plans milestones, engineer finishes work, PM approves, client sees both numbers', async () => {
    // ── PM opens the milestone plan of P002 (seed: 40% physical progress) ──
    await signInAs('pm@apex.com');
    let ui = render(<App at="/pm/milestones" />);
    await find(/Physical progress \(weighted\)/);
    await find(/Foundation/); // first assigned project (P001) is shown first
    expect(screen.getAllByText(/late/).length).toBeGreaterThan(0); // overdue milestones are flagged
    // project selector shows the PM's two projects; pick P002 (Commercial Complex)
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'P002' } });
    await find(/Electrical & plumbing rough-in/);
    await find(/Finishing/);
    expect(screen.getAllByText('40%').length).toBeGreaterThan(0);

    // ── weights above 100% are refused with a helpful message ──
    // P002 weights are 50 + 50 = 100%: nothing left to allocate, so the add button is disabled
    expect(screen.getByRole('button', { name: /Add milestone/ }).disabled).toBe(true);
    ui.unmount();

    // free up 20% first through the API, then add a milestone through the UI
    expect((await api.updateMilestone('MS004', { weight: 30 })).error).toBeUndefined();
    ui = render(<App at="/pm/milestones" />);
    await find(/Physical progress/);
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'P002' } });
    await find(/Finishing/);
    fireEvent.click(screen.getByRole('button', { name: /Add milestone/ }));
    const modal = await waitFor(() => {
      const m = document.querySelector('.modal-box');
      expect(m).toBeTruthy();
      return m;
    });
    const inputs = modal.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'Snagging and handover' } });
    fireEvent.change(inputs[1], { target: { value: '2027-12-31' } });
    fireEvent.change(inputs[2], { target: { value: '50' } }); // too big: only 20% left
    fireEvent.submit(modal.querySelector('form'));
    await find(/at most 20%/);
    fireEvent.change(inputs[2], { target: { value: '20' } });
    fireEvent.submit(modal.querySelector('form'));
    await find(/Snagging and handover/);
    await waitFor(() => expect(document.querySelector('.modal-box')).toBeNull());

    // ── the new milestone is empty, so it cannot be approved ──
    const card = screen.getByTestId(/milestone-MS0(09|10)/);
    expect(within(card).getByRole('button', { name: /Verify & approve/ }).disabled).toBe(true);
    ui.unmount();

    // ── PM creates a task INSIDE the milestone through the real task form ──
    ui = render(<App at="/pm/tasks" />);
    fireEvent.click(await screen.findByRole('button', { name: /New Task/ }, { timeout: 8000 }));
    const taskModal = await waitFor(() => {
      const m = document.querySelector('.modal-box');
      expect(m).toBeTruthy();
      return m;
    });
    const control = (label) =>
      [...taskModal.querySelectorAll('label')].find((l) => l.textContent.includes(label)).closest('.form-group').querySelector('select,input,textarea');
    // the page loads projects/milestones asynchronously: wait until the dropdowns are populated
    await waitFor(() => expect(control('Project').options.length).toBeGreaterThan(2), { timeout: 8000 });
    await waitFor(() => expect(control('Assigned Site Engineer').options.length).toBeGreaterThan(1), { timeout: 8000 });
    fireEvent.change(control('Assigned Site Engineer'), { target: { value: 'U003' } });
    fireEvent.change(control('Task Title'), { target: { value: 'Final snag list' } });
    fireEvent.change(control('Project'), { target: { value: 'P002' } });
    // the milestone list follows the chosen project and only offers open milestones
    const msSelect = control('Milestone');
    const msOptions = [...msSelect.options].map((o) => o.textContent);
    expect(msOptions).toContain('Snagging and handover');
    expect(msOptions).not.toContain('Foundation'); // belongs to project P001
    fireEvent.change(msSelect, { target: { value: 'MS009' } });
    fireEvent.change(control('Start Date'), { target: { value: '2026-11-01' } });
    fireEvent.change(control('Deadline'), { target: { value: '2026-12-01' } });
    fireEvent.change(control('Task Description'), { target: { value: 'Walk the site and list defects' } });
    fireEvent.submit(taskModal.querySelector('form'));
    await waitFor(() => expect(document.querySelector('.modal-box')).toBeNull(), { timeout: 8000 });
    await find(/Final snag list/);
    ui.unmount();
    const allTasks = await api.getTasks();
    const created = allTasks.find((t) => t.title === 'Final snag list');
    expect(created && created.milestoneId).toBe('MS009');
    // an invalid combination is rejected and the message reaches the caller (no silent offline fallback)
    const bad = await api.updateTask(created.id, { status: 'Completed', progress: 40 });
    expect(bad.error).toBe(true);
    expect(bad.message).toMatch(/100%/);

    // ── Site engineer sees the milestone on their task and finishes it ──
    await signInAs('site@apex.com');
    ui = render(<App at="/se/tasks" />);
    await find(/Final snag list/);
    await find(/Snagging and handover/); // milestone shown on the task card
    ui.unmount();
    expect((await api.updateTask(created.id, { status: 'Completed', progress: 100 })).error).toBeUndefined();
    // engineers cannot approve milestones
    expect((await api.approveMilestone('MS009')).error).toBe(true);

    // ── PM approves; the milestone becomes approved and the button turns into Reopen ──
    await signInAs('pm@apex.com');
    ui = render(<App at="/pm/milestones" />);
    await find(/Physical progress/);
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'P002' } });
    await find(/Snagging and handover/);
    const ms = screen.getByTestId('milestone-MS009');
    const approve = within(ms).getByRole('button', { name: /Verify & approve/ });
    await waitFor(() => expect(approve.disabled).toBe(false));
    fireEvent.click(approve);
    await waitFor(() => expect(within(screen.getByTestId('milestone-MS009')).getByRole('button', { name: /Reopen/ })).toBeTruthy(), { timeout: 8000 });
    ui.unmount();

    // ── client (owner of P002 is client2) sees physical progress AND milestones approved ──
    await signInAs('client2@apex.com', 'password123');
    ui = render(<App at="/client/progress" />);
    await find(/Progress & Milestones/);
    await find(/Milestones approved/);
    await find(/Snagging and handover/);
    expect(screen.getAllByText(/Approved/).length).toBeGreaterThan(0);
    // the milestone summary matches the API
    const sum = await api.getProjectProgress('P002');
    expect(sum.milestonesApproved).toBe(1);
    expect(sum.physicalProgress).toBe(Math.round(0.5 * 80 + 0.3 * 0 + 0.2 * 100));
    ui.unmount();
  }, 60000);
});
