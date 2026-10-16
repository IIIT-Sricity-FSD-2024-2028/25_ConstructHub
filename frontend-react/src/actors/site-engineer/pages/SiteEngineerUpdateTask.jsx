import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../../../services/api';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function SiteEngineerUpdateTask() {
  const { user } = useOutletContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(searchParams.get('id') || '');
  const [selectedTask, setSelectedTask] = useState(null);

  const [progress, setProgress] = useState('');
  const [status, setStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [allTasks, allProjects] = await Promise.all([
      api.getTasks(user.companyId),
      api.getProjects(user.companyId)
    ]);
    const myTasks = (allTasks || []).filter(
      (t) => t.assignedTo === user.id && t.status !== 'Completed'
    );
    setTasks(myTasks);
    setProjects(allProjects || []);

    const initialId = searchParams.get('id');
    if (initialId) {
      const target = (allTasks || []).find((t) => t.id === initialId);
      if (target) {
        setSelectedTaskId(target.id);
        setSelectedTask(target);
        setProgress(String(target.progress || 0));
        setStatus(target.status || 'In Progress');
        setRemarks(target.remarks || '');
      }
    }
  }

  function handleTaskSelect(id) {
    setSelectedTaskId(id);
    setErrors({});
    if (!id) {
      setSelectedTask(null);
      setProgress('');
      setStatus('');
      setRemarks('');
      return;
    }
    const t = tasks.find((item) => item.id === id);
    if (t) {
      setSelectedTask(t);
      setProgress(String(t.progress || 0));
      setStatus(t.status || 'In Progress');
      setRemarks(t.remarks || '');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};

    if (!selectedTaskId) errs.task = 'Please select a task';
    if (progress === '') {
      errs.progress = 'Please enter completion percentage';
    } else {
      const numProg = Number(progress);
      if (isNaN(numProg) || numProg < 0 || numProg > 100) {
        errs.progress = 'Must be between 0 and 100';
      }
    }
    if (!status) errs.status = 'Please select a status';

    const numProg = Number(progress);
    if (status === 'Completed' && numProg !== 100) {
      errs.status = "Status cannot be 'Completed' unless progress is 100%";
    } else if (numProg === 100 && status !== 'Completed') {
      errs.progress = "Progress is 100%, status must be 'Completed'";
    }

    if (remarks.length > 500) {
      errs.remarks = 'Max 500 characters';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      await api.updateTask(selectedTaskId, {
        progress: numProg,
        status,
        remarks: remarks.trim()
      });

      if (status === 'Completed') {
        const completedTask = selectedTask;
        if (completedTask) {
          const proj = projects.find((p) => p.id === completedTask.projectId);
          if (proj && proj.managerId) {
            await api.createNotification({
              userId: proj.managerId,
              type: 'task',
              title: 'Task Completed',
              body: `${user.name} has completed the task "${completedTask.title}" on project ${completedTask.projectName}.`
            });
          }
        }
      }

      setIsSuccessOpen(true);
    } catch (err) {
      setErrors({ form: err.message || 'Failed to update task status' });
    }
  }

  return (
    <div className="page-container">
      <button
        onClick={() => navigate('/site-engineer/my-tasks')}
        className="back-btn"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
          marginBottom: '16px'
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Update Task Status</h1>
        <p className="page-subtitle">Update progress and completion status for assigned tasks</p>
      </div>

      <div style={{ maxWidth: '540px' }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            {errors.form && (
              <div className="error-alert" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {errors.form}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Select Task <span className="req">*</span></label>
              <select
                className={`form-select ${errors.task ? 'input-error' : ''}`}
                value={selectedTaskId}
                onChange={(e) => handleTaskSelect(e.target.value)}
              >
                <option value="">Select a task to update</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} — {t.projectName}
                  </option>
                ))}
              </select>
              {errors.task && <span className="field-error">{errors.task}</span>}
            </div>

            {selectedTask && (
              <div
                style={{
                  background: 'var(--bg)',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '16px',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedTask.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0' }}>
                  {selectedTask.projectName} · Current Status: <strong>{selectedTask.status}</strong>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${selectedTask.progress || 0}%` }}></div>
                  </div>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {selectedTask.progress || 0}% current completion
                  </span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Completion Percentage <span className="req">*</span></label>
              <input
                type="number"
                className={`form-input ${errors.progress ? 'input-error' : ''}`}
                min="0"
                max="100"
                placeholder="0 - 100"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
              />
              {errors.progress && <span className="field-error">{errors.progress}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Status <span className="req">*</span></label>
              <select
                className={`form-select ${errors.status ? 'input-error' : ''}`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Select status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              {errors.status && <span className="field-error">{errors.status}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea
                className={`form-textarea ${errors.remarks ? 'input-error' : ''}`}
                placeholder="Add any notes or updates..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <span className="form-hint">Max 500 characters</span>
              {errors.remarks && <span className="field-error">{errors.remarks}</span>}
            </div>

            <Button variant="primary" type="submit" style={{ width: '100%', padding: '12px' }}>
              ✓ Update Task
            </Button>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {isSuccessOpen && (
        <Modal
          isOpen={isSuccessOpen}
          title=""
          onClose={() => {
            setIsSuccessOpen(false);
            navigate('/site-engineer/my-tasks');
          }}
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              className="icon-box icon-box-green icon-box-lg"
              style={{ margin: '0 auto 16px', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Task Status Updated</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              The project manager will be notified of your update.
            </p>
            <Button
              variant="success"
              style={{ width: '100%' }}
              onClick={() => {
                setIsSuccessOpen(false);
                navigate('/site-engineer/my-tasks');
              }}
            >
              View All Tasks
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
