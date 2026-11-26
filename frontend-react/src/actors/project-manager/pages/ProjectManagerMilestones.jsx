import { useState } from 'react';
import { useAppDispatch, useAppSelector, useLoad, isFirstLoad, errorText } from '../../../store/hooks';
import { fetchProjects, selectProjectsManagedBy, selectProjectsStatus } from '../../../features/projects/projectsSlice';
import { fetchTasks, createTask, updateTask, selectTasksByProject } from '../../../features/tasks/tasksSlice';
import { fetchReports, selectReportsByProject } from '../../../features/reports/reportsSlice';
import { fetchUsers, selectUsersByRole } from '../../../features/users/usersSlice';
import {
  fetchProjectProgress, createMilestone, updateMilestone, deleteMilestone, approveMilestone, reopenMilestone, selectProgressEntry
} from '../../../features/milestones/milestonesSlice';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, CheckCircle2, RotateCcw, Lock } from 'lucide-react';
import { formatDate, localDateISO } from '../../../services/utils';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../components/common/Modal';
import { MilestoneStatusBadge, DelayBadge, Bar, ProgressSummary } from '../../../components/milestones/MilestoneUi';

const emptyForm = { name: '', description: '', deadline: '', weight: '' };
const emptyTaskForm = { title: '', milestoneId: '', engineerId: '', startDate: '', deadline: '', priority: 'Medium', description: '' };

export default function ProjectManagerMilestones() {
  const { user } = useOutletContext();
  const toast = useToast();

  const dispatch = useAppDispatch();
  const projects = useAppSelector((state) => selectProjectsManagedBy(state, user?.id));
  const projectsStatus = useAppSelector(selectProjectsStatus);
  const [pickedProjectId, setProjectId] = useState('');
  const projectId = pickedProjectId || projects[0]?.id || '';
  const project = projects.find((p) => p.id === projectId) || null;
  const allowed = project?.allowed || {};

  const progressEntry = useAppSelector((state) => selectProgressEntry(state, projectId));
  const summary = progressEntry.data;
  const error = progressEntry.error || '';
  const tasks = useAppSelector((state) => selectTasksByProject(state, projectId));
  const reports = useAppSelector((state) => selectReportsByProject(state, projectId));
  const engineers = useAppSelector((state) => selectUsersByRole(state, 'site_engineer')).filter((x) => x.status !== 'inactive');
  const [busy, setBusy] = useState(false);

  useLoad([fetchProjects, fetchTasks, fetchReports, fetchUsers]);
  useLoad([projectId && [fetchProjectProgress, projectId]], [projectId]);

  const [editing, setEditing] = useState(null); // null | 'new' | milestone
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Add Task directly inside a Milestone
  const [taskModalMs, setTaskModalMs] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [taskError, setTaskError] = useState('');

  /** Runs one thunk, shows the result, and reloads the milestone summary (task changes move progress). */
  async function run(action, okMessage) {
    setBusy(true);
    try {
      await dispatch(action).unwrap();
    } catch (err) {
      toast.error(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
    if (okMessage) toast.success(okMessage);
    dispatch(fetchProjectProgress(projectId));
    return true;
  }

  function openNew() {
    setForm(emptyForm);
    setFormError('');
    setEditing('new');
  }
  function openEdit(m) {
    setForm({ name: m.name, description: m.description || '', deadline: m.deadline, weight: String(m.weight) });
    setFormError('');
    setEditing(m);
  }

  function openNewTask(m) {
    const todayIso = localDateISO();
    setTaskForm({
      title: '',
      milestoneId: m.id,
      engineerId: engineers[0]?.id || '',
      startDate: todayIso,
      deadline: m.deadline && m.deadline > todayIso ? m.deadline : '',
      priority: 'Medium',
      description: '',
    });
    setTaskError('');
    setTaskModalMs(m);
  }

  async function saveTask(e) {
    e.preventDefault();
    setTaskError('');
    if (!taskForm.title.trim()) return setTaskError('Enter a task title.');
    if (!taskForm.engineerId) return setTaskError('Select an assigned Site Engineer.');
    if (!taskForm.startDate) return setTaskError('Choose a start date.');
    if (!taskForm.deadline || taskForm.deadline <= taskForm.startDate) return setTaskError('Deadline must be after the start date.');
    if (!taskForm.description.trim()) return setTaskError('Enter a task description.');

    const proj = projects.find((p) => p.id === projectId);
    const eng = engineers.find((x) => x.id === taskForm.engineerId);
    setBusy(true);
    let created;
    try {
      created = await dispatch(createTask({
      milestoneId: taskForm.milestoneId,
      title: taskForm.title.trim(),
      projectId,
      projectName: proj ? proj.name : summary?.projectName || '',
      assignedTo: taskForm.engineerId,
      assignedName: eng ? eng.name : '',
      priority: taskForm.priority,
      status: 'Pending',
      progress: 0,
      startDate: taskForm.startDate,
      deadline: taskForm.deadline,
      description: taskForm.description.trim(),
      remarks: '',
      })).unwrap();
    } catch (err) {
      return setTaskError(errorText(err));
    } finally {
      setBusy(false);
    }
    toast.success(`Task "${created.title}" added to ${taskModalMs?.name}.`);
    setTaskModalMs(null);
    dispatch(fetchProjectProgress(projectId));
  }

  async function save(e) {
    e.preventDefault();
    setFormError('');
    const weight = Number(form.weight);
    if (form.name.trim().length < 3) return setFormError('Name must be at least 3 characters.');
    if (!form.deadline) return setFormError('Choose a deadline.');
    if (!Number.isInteger(weight) || weight < 1 || weight > 100) return setFormError('Weight must be a whole number from 1 to 100.');
    const isNew = editing === 'new';
    // A contract stage keeps the name and weight of the accepted quotation: only its description and deadline change.
    const payload = editingContractStage
      ? { description: form.description.trim(), deadline: form.deadline }
      : { name: form.name.trim(), description: form.description.trim(), deadline: form.deadline, weight };
    setBusy(true);
    try {
      await dispatch(isNew
        ? createMilestone({ ...payload, projectId })
        : updateMilestone({ id: editing.id, projectId, changes: payload })).unwrap(); // the thunk reloads the summary
    } catch (err) {
      return setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
    toast.success(isNew ? 'Milestone created.' : 'Milestone updated.');
    setEditing(null);
  }

  async function assignTask(task, milestoneId) {
    await run(updateTask({ id: task.id, changes: { milestoneId: milestoneId || null } }), milestoneId ? 'Task added to milestone.' : 'Task removed from milestone.');
  }

  if (!user) return null;
  if (isFirstLoad(projectsStatus, projects.length > 0)) return <div className="card">Loading...</div>;
  if (projects.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <h3>No projects assigned to you</h3>
        <p style={{ color: 'var(--text-muted)' }}>Milestones are planned by the project manager assigned to a project.</p>
      </div>
    );
  }

  const milestones = summary?.milestones || [];
  const unassigned = tasks.filter((t) => !t.milestoneId);
  const remaining = summary ? Math.max(0, 100 - summary.weightAllocated) : 100;
  const editableMilestones = milestones.filter((m) => m.status !== 'Completed');
  const maxWeightForForm = editing && editing !== 'new' ? remaining + editing.weight : remaining;
  // Stages of an awarded quotation are fixed by the contract: no new milestones, no deleting, no renaming or re-weighting.
  const isContractStage = (m) => m.stageIndex !== undefined && m.stageIndex !== null;
  const isContractLocked = project?.source === 'marketplace' || (milestones.length > 0 && milestones.every(isContractStage));
  const editingContractStage = Boolean(editing && editing !== 'new' && isContractStage(editing));
  const tasksLockedReason = allowed.awaitingAdvance
    ? 'Tasks can be added once the client pays the mobilization advance.'
    : allowed.completed ? 'This project is completed.' : '';

  return (
    <div>
      <div className="page-header-row">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Milestones</h1>
          <p>Break contracted stages into tasks, verify daily site reports, and approve completed milestones for billing.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {projects.length > 1 && (
            <select className="form-select" value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Project">
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {allowed.canAddMilestones && !isContractLocked && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || remaining <= 0}
              onClick={openNew}
              title={remaining <= 0 ? 'All 100% weight is already allocated' : 'Add a milestone'}
            >
              <Plus size={15} /> Add milestone
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
      {tasksLockedReason && (
        <div className="notice-warn" data-testid="tasks-locked-note"><Lock size={14} /> {tasksLockedReason}</div>
      )}

      {summary && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-header">
            <h3 className="section-title">{summary.projectName}</h3>
            {isContractLocked && <span className="badge badge-blue">Contract-locked stages (from awarded quotation)</span>}
          </div>
          <ProgressSummary summary={summary} />
          {summary.mode !== 'milestones' && (
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 10 }}>
              Adding the first milestone switches this project to calculated progress: the manually entered percentage will be replaced.
            </p>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-header"><h3 className="section-title">Stage Schedule &amp; Field Verification Ledger</h3></div>
        <div className="hairline-list">
        {milestones.map((m) => {
          const mTasks = tasks.filter((t) => t.milestoneId === m.id);
          const mReports = reports.filter((r) => r.milestoneId === m.id);
          const stageLocked = isContractStage(m);
          const canApprove = m.status === 'Ready for Review' && mReports.length > 0;
          return (
            <div className="hairline-row" key={m.id} data-testid={`milestone-${m.id}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{m.name}</strong>{' '}
                  <MilestoneStatusBadge status={m.status} /> <DelayBadge milestone={m} />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Due {formatDate(m.deadline)} · weight {m.weight}% · {m.completedTasks} of {m.taskCount} task(s) done · {mReports.length} site report(s) attached
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{m.progress}%</div>
              </div>
              <div style={{ margin: '8px 0 12px' }}><Bar value={m.progress} color={m.status === 'Completed' ? 'var(--green)' : undefined} /></div>
              {m.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{m.description}</p>}

              {mTasks.length > 0 && (
                <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                  {mTasks.map((t) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.assignedName}</span>
                      <span style={{ width: 120 }}><Bar value={t.progress} height={6} /></span>
                      <span style={{ width: 36, textAlign: 'right', fontWeight: 600 }}>{t.progress || 0}%</span>
                      {m.status !== 'Completed' && (
                        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => assignTask(t, '')} title="Remove from milestone">Remove</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {m.status === 'Completed' ? (
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => run(reopenMilestone({ id: m.id, projectId }), 'Milestone reopened.')}>
                    <RotateCcw size={13} /> Reopen
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`btn ${canApprove ? 'btn-success' : 'btn-secondary'} btn-sm`}
                      disabled={busy}
                      onClick={() => {
                        if (m.taskCount === 0) {
                          toast.error(`Cannot approve "${m.name}" yet: click "+ Add task" to assign at least 1 task to this milestone first.`);
                          return;
                        }
                        if (m.status !== 'Ready for Review') {
                          toast.error(`Cannot approve "${m.name}" yet: ${m.completedTasks} of ${m.taskCount} task(s) are completed. All tasks must reach 100% first.`);
                          return;
                        }
                        if (mReports.length === 0) {
                          toast.error(`Cannot approve "${m.name}" yet: the Site Engineer must submit at least 1 Site Report linked to this milestone as proof of work.`);
                          return;
                        }
                        void run(approveMilestone({ id: m.id, projectId }), `"${m.name}" verified and approved. The client and Finance Manager were notified.`);
                      }}
                    >
                      <CheckCircle2 size={13} /> Verify & approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy || !allowed.canManageTasks}
                      title={tasksLockedReason || 'Add a task to this milestone'}
                      onClick={() => openNewTask(m)}
                    >
                      <Plus size={13} /> Add task
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => openEdit(m)}>
                      <Pencil size={13} /> Edit
                    </button>
                    {!stageLocked && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busy}
                        onClick={() => setDeleteTarget(m)}
                        title="Delete milestone"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                    <span style={{ fontSize: 12, color: canApprove ? '#166534' : 'var(--text-muted)', marginLeft: 4 }}>
                      {m.taskCount === 0
                        ? 'Requires: ≥1 task completed (100%) + ≥1 Site Report'
                        : m.status !== 'Ready for Review'
                          ? `Requires: all ${m.taskCount} task(s) at 100% (${m.completedTasks}/${m.taskCount} done)`
                          : mReports.length === 0
                            ? 'Requires: ≥1 Site Engineer report attached before approval'
                            : `✓ Ready to approve (${mReports.length} site report(s) verified)`}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {summary && milestones.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <h3>No milestones yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>Milestones are created automatically when a quotation is awarded.</p>
          </div>
        )}
        </div>
      </div>

      {milestones.length > 0 && unassigned.length > 0 && (
        <div className="card">
          <div className="section-header"><h3 className="section-title">Tasks not in any milestone ({unassigned.length})</h3></div>
          {unassigned.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Every task of this project belongs to a milestone.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {unassigned.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 160 }}>{t.title} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>· {t.progress || 0}%</span></span>
                  <select
                    className="form-select"
                    style={{ maxWidth: 240 }}
                    value=""
                    disabled={busy || editableMilestones.length === 0}
                    aria-label={`Milestone for ${t.title}`}
                    onChange={(e) => assignTask(t, e.target.value)}
                  >
                    <option value="">Add to milestone...</option>
                    {editableMilestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={!!taskModalMs} onClose={() => setTaskModalMs(null)} title={`Add task to "${taskModalMs?.name || ''}"`} size="md">
        <form onSubmit={saveTask}>
          {taskError && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{taskError}</div>}
          <div className="form-group">
            <label className="form-label">Task title <span className="req">*</span></label>
            <input className="form-input" maxLength={120} value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Formwork and rebar inspection" />
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Site Engineer <span className="req">*</span></label>
            <select className="form-select" value={taskForm.engineerId} onChange={(e) => setTaskForm({ ...taskForm, engineerId: e.target.value })}>
              <option value="">Select engineer</option>
              {engineers.map((eng) => <option key={eng.id} value={eng.id}>{eng.name}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Start date <span className="req">*</span></label>
              <input className="form-input" type="date" value={taskForm.startDate} onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Deadline <span className="req">*</span></label>
              <input className="form-input" type="date" value={taskForm.deadline} onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Task description <span className="req">*</span></label>
            <textarea className="form-textarea" rows={2} maxLength={500} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Describe what the site engineer needs to complete..." />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setTaskModalMs(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Assign task'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add milestone' : 'Edit milestone'} size="md">
        <form onSubmit={save}>
          {formError && <div className="error-msg" style={{ display: 'block', marginBottom: 12 }}>{formError}</div>}
          <div className="form-group">
            <label className="form-label">Name <span className="req">*</span></label>
            <input className="form-input" maxLength={100} value={form.name} disabled={editingContractStage} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Foundation" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={2} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Deadline <span className="req">*</span></label>
              <input className="form-input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Weight (% of project) <span className="req">*</span></label>
              <input className="form-input" type="number" min="1" max={Math.max(1, maxWeightForForm)} value={form.weight} disabled={editingContractStage} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {editingContractStage ? 'Name and weight come from the contract.' : `Up to ${maxWeightForForm}% available`}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save milestone'}</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete milestone?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                const target = deleteTarget;
                setDeleteTarget(null);
                await run(deleteMilestone({ id: target.id, projectId }), 'Milestone deleted.');
              }}
            >
              Delete
            </button>
          </>
        }
      >
        {deleteTarget && <p>"{deleteTarget.name}" will be removed. Its tasks are kept and become unassigned, and project progress is recalculated.</p>}
      </Modal>
    </div>
  );
}
