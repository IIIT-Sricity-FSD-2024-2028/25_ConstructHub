// @vitest-environment jsdom
/**
 * UI flow test for milestones & progress, run against the REAL backend (fresh data/db, http://localhost:3000).
 *   cd frontend-react && npm install (vitest and testing-library are dev dependencies)
 *   npx vitest run tests/milestones.flow.test.jsx
 */
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import TestProviders from './TestProviders';
import { api } from './testApi';
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
      <TestProviders>
          <Routes>
            <Route element={<WithUser />}>
              <Route path="/pm/milestones" element={<ProjectManagerMilestones />} />
              <Route path="/pm/tasks" element={<ProjectManagerTasks />} />
              <Route path="/se/tasks" element={<SiteEngineerMyTasks />} />
              <Route path="/client/progress" element={<ClientProjectProgress />} />
            </Route>
          </Routes>
      </TestProviders>
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

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

describe('milestones & progress UI', () => {
  test('contract stages are locked; on a hand-planned project the PM plans, the engineer works, the PM approves', async () => {
    // ── P002 came from an awarded quotation: its stages are fixed by the contract ──
    await signInAs('pm@apex.com');
    let ui = render(<App at="/pm/milestones" />);
    await find(/Physical progress \(weighted\)/);
    await find(/Foundation/); // first assigned project (P001) is shown first
    expect(screen.getAllByText(/late/).length).toBeGreaterThan(0); // overdue milestones are flagged
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'P002' } });
    await find(/Electrical & plumbing rough-in/);
    await find(/Contract-locked stages/);
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Add milestone/ })).toBeNull(); // no new stages on a contract
    expect(within(screen.getByTestId('milestone-MS004')).queryByRole('button', { name: /Delete/ })).toBeNull();
    ui.unmount();

    // ── a project that did not come from the marketplace (platform test data) with two hand-made milestones ──
    await signInAs('super@ch.com');
    const tp = await api.createProject({
      name: 'UI Fit-out', companyId: 'COMP001', location: 'Pune', clientId: 'U011', clientName: 'Suresh Shah', managerId: 'U002',
      financeManagerId: 'U004', budget: 5000000, progress: 0, status: 'On Track', startDate: inDays(-30), endDate: inDays(300),
      teamSize: 3, allocations: { Other: 5000000 }, description: 'Fit-out test project'
    });
    expect(tp.error, JSON.stringify(tp)).toBeUndefined();
    await signInAs('pm@apex.com');
    const roughIn = await api.createMilestone({ projectId: tp.id, name: 'Rough-in', deadline: inDays(60), weight: 50 });
    const finishing = await api.createMilestone({ projectId: tp.id, name: 'Finishing', deadline: inDays(120), weight: 50 });
    expect(roughIn.error || finishing.error, JSON.stringify([roughIn, finishing])).toBeUndefined();

    // weights are 50 + 50 = 100%: nothing left to allocate, so the add button is disabled
    ui = render(<App at="/pm/milestones" />);
    await find(/Physical progress/);
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: tp.id } });
    await find(/Rough-in/);
    await waitFor(() => expect(screen.getByRole('button', { name: /Add milestone/ }).disabled).toBe(true));
    ui.unmount();

    // free up 20% first through the API, then add a milestone through the UI
    expect((await api.updateMilestone(finishing.id, { weight: 30 })).error).toBeUndefined();
    ui = render(<App at="/pm/milestones" />);
    await find(/Physical progress/);
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: tp.id } });
    await find(/Finishing/);
    fireEvent.click(await screen.findByRole('button', { name: /Add milestone/ }));
    const modal = await waitFor(() => {
      const m = document.querySelector('.modal-box');
      expect(m).toBeTruthy();
      return m;
    });
    const inputs = modal.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'Snagging and handover' } });
    fireEvent.change(inputs[1], { target: { value: inDays(200) } });
    fireEvent.change(inputs[2], { target: { value: '50' } }); // too big: only 20% left
    fireEvent.submit(modal.querySelector('form'));
    await find(/at most 20%/);
    fireEvent.change(inputs[2], { target: { value: '20' } });
    fireEvent.submit(modal.querySelector('form'));
    await find(/Snagging and handover/);
    await waitFor(() => expect(document.querySelector('.modal-box')).toBeNull());
    const snag = (await api.getProjectProgress(tp.id)).milestones.find((m) => m.name === 'Snagging and handover');

    // ── the new milestone is empty, so it cannot be approved ──
    const card = screen.getByTestId(`milestone-${snag.id}`);
    fireEvent.click(within(card).getByRole('button', { name: /Verify & approve/ }));
    await find(/assign at least 1 task to this milestone first/);
    ui.unmount();

    // ── PM creates a task INSIDE the milestone through the real task form ──
    ui = render(<App at="/pm/tasks" />);
    const newTask = await screen.findByRole('button', { name: /New Task/ }, { timeout: 8000 });
    await waitFor(() => expect(newTask.disabled).toBe(false), { timeout: 8000 }); // enabled once the projects have loaded
    fireEvent.click(newTask);
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
    fireEvent.change(control('Project'), { target: { value: tp.id } });
    // the milestone list follows the chosen project and only offers open milestones
    const msSelect = control('Milestone');
    const msOptions = [...msSelect.options].map((o) => o.textContent);
    expect(msOptions).toContain('Snagging and handover');
    expect(msOptions).not.toContain('Foundation'); // belongs to project P001
    fireEvent.change(msSelect, { target: { value: snag.id } });
    fireEvent.change(control('Start Date'), { target: { value: inDays(-1) } });
    fireEvent.change(control('Deadline'), { target: { value: inDays(20) } });
    fireEvent.change(control('Task Description'), { target: { value: 'Walk the site and list defects' } });
    fireEvent.submit(taskModal.querySelector('form'));
    await waitFor(() => expect(document.querySelector('.modal-box')).toBeNull(), { timeout: 8000 });
    await find(/Final snag list/);
    ui.unmount();
    const allTasks = await api.getTasks();
    const created = allTasks.find((t) => t.title === 'Final snag list');
    expect(created && created.milestoneId).toBe(snag.id);
    // an invalid combination is rejected and the message reaches the caller (no silent offline fallback)
    const bad = await api.updateTask(created.id, { status: 'Completed', progress: 40 });
    expect(bad.error).toBe(true);
    expect(bad.message).toMatch(/100%/);

    // ── Site engineer sees the milestone on their task, files the evidence report, then finishes the task ──
    await signInAs('site@apex.com');
    ui = render(<App at="/se/tasks" />);
    await find(/Final snag list/);
    await find(/Snagging and handover/); // milestone shown on the task card
    ui.unmount();
    // engineers cannot approve milestones
    expect((await api.approveMilestone(snag.id)).error).toBe(true);
    const report = await api.createReport({ title: 'Snagging done', projectId: tp.id, submittedBy: 'U003', date: inDays(0), progress: 100, status: 'Completed', workDone: 'All defects closed', priority: 'Low', materials: [], photos: 0, milestoneId: snag.id, weather: 'Sunny', laborCount: 4 });
    expect(report.error, JSON.stringify(report)).toBeUndefined();
    expect((await api.updateTask(created.id, { status: 'Completed', progress: 100 })).error).toBeUndefined();

    // ── PM approves; the milestone becomes approved and the button turns into Reopen ──
    await signInAs('pm@apex.com');
    ui = render(<App at="/pm/milestones" />);
    await find(/Physical progress/);
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: tp.id } });
    await find(/Snagging and handover/);
    const ms = screen.getByTestId(`milestone-${snag.id}`);
    const approve = within(ms).getByRole('button', { name: /Verify & approve/ });
    await waitFor(() => expect(approve.disabled).toBe(false));
    fireEvent.click(approve);
    await waitFor(() => expect(within(screen.getByTestId(`milestone-${snag.id}`)).getByRole('button', { name: /Reopen/ })).toBeTruthy(), { timeout: 8000 });
    ui.unmount();

    // ── the client of the project sees physical progress AND milestones approved ──
    await signInAs('client3@gmail.com', '123456');
    ui = render(<App at="/client/progress" />);
    await find(/Progress & Milestones/);
    fireEvent.change(await screen.findByLabelText('Project'), { target: { value: tp.id } });
    await find(/Milestones approved/);
    await find(/Snagging and handover/);
    expect(screen.getAllByText(/Approved/).length).toBeGreaterThan(0);
    // the milestone summary matches the API
    const sum = await api.getProjectProgress(tp.id);
    expect(sum.milestonesApproved).toBe(1);
    expect(sum.physicalProgress).toBe(Math.round(0.5 * 0 + 0.3 * 0 + 0.2 * 100));
    ui.unmount();
  }, 60000);
});
