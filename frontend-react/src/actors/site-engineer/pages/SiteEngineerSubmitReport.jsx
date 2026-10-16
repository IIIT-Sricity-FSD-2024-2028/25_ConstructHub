import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  Edit3,
  Wrench,
  Camera,
  UploadCloud,
  Send,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../../../services/api';
import { formatDate } from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function SiteEngineerSubmitReport() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);

  // Form State
  const [projectId, setProjectId] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [workDone, setWorkDone] = useState('');
  const [progress, setProgress] = useState('');

  const [issues, setIssues] = useState('');
  const [issuePriority, setIssuePriority] = useState('Low');

  const [remarks, setRemarks] = useState('');

  const [materials, setMaterials] = useState([
    { name: '', qty: '', unit: '' }
  ]);

  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [photoDesc, setPhotoDesc] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [errors, setErrors] = useState({});
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [engineerTasks, setEngineerTasks] = useState([]);

  useEffect(() => {
    loadProjects();
  }, [user]);

  async function loadProjects() {
    if (!user) return;
    const [allProjects, allTasks] = await Promise.all([
      api.getProjects(user.companyId),
      api.getTasks(user.companyId)
    ]);

    // Option 2 (Pool-based): Engineer's projects are those where the engineer has assigned tasks
    const myTasks = (allTasks || []).filter((t) => t.assignedTo === user.id);
    setEngineerTasks(myTasks);

    const myProjectIds = new Set(myTasks.map((t) => t.projectId));
    let assignedProjects = (allProjects || []).filter((p) => myProjectIds.has(p.id));

    // Fallback: If no tasks assigned yet (or legacy seed), include directly tagged or all company projects so user is not blocked
    if (assignedProjects.length === 0 && (allProjects || []).length > 0) {
      const directAssigned = (allProjects || []).filter((p) => p.siteEngineerId === user.id);
      assignedProjects = directAssigned.length > 0 ? directAssigned : allProjects;
    }

    setProjects(assignedProjects || []);
    if (assignedProjects && assignedProjects.length > 0) {
      setProjectId(assignedProjects[0].id);
    }
  }

  // Materials Row Handlers
  function addMaterialRow() {
    setMaterials([...materials, { name: '', qty: '', unit: '' }]);
  }

  function removeMaterialRow(index) {
    if (materials.length > 1) {
      setMaterials(materials.filter((_, i) => i !== index));
    }
  }

  function updateMaterial(index, field, value) {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
  }

  // Photo Upload Handler
  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (files.length + uploadedPhotos.length > 10) {
      alert('Maximum 10 photos allowed per report.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading photos...');

    try {
      const result = await api.uploadReportPhotos(files);
      const urls = result?.photoUrls || [];
      setUploadedPhotos([...uploadedPhotos, ...urls]);
      setUploadStatus(`${result?.count || urls.length} photo(s) uploaded successfully.`);
    } catch {
      // Offline fallback: load local object URLs for testing/offline support
      const localUrls = files.map((file) => URL.createObjectURL(file));
      setUploadedPhotos([...uploadedPhotos, ...localUrls]);
      setUploadStatus(`${files.length} photo(s) attached.`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  function removePhoto(index) {
    setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== index));
  }

  // Form Validation & Submit
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};

    if (!projectId) errs.projectId = 'Please select a project';
    if (!reportDate) errs.reportDate = 'Please select a date';
    if (!workDone.trim()) errs.workDone = 'Please describe the work completed today';
    if (workDone.length > 1000) errs.workDone = 'Max 1000 characters';

    if (progress === '') {
      errs.progress = 'Please enter overall progress';
    } else {
      const p = Number(progress);
      if (isNaN(p) || p < 0 || p > 100) errs.progress = 'Progress must be 0-100';
    }

    if (issues.length > 500) errs.issues = 'Max 500 characters';

    // Validate materials
    const validMaterials = [];
    for (let i = 0; i < materials.length; i++) {
      const m = materials[i];
      const hasAny = m.name.trim() || m.qty || m.unit;
      if (hasAny) {
        if (!m.name.trim() || !m.qty || !m.unit) {
          errs.materials = 'Incomplete material row. Please provide Name, Quantity, and Unit, or remove the row.';
          break;
        }
        if (Number(m.qty) <= 0) {
          errs.materials = 'Material quantity must be greater than 0';
          break;
        }
        validMaterials.push({ name: m.name.trim(), qty: Number(m.qty), unit: m.unit });
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const proj = projects.find((p) => p.id === projectId);
      const newReport = await api.createReport({
        title: `Site Report - ${formatDate(reportDate)}`,
        projectId: projectId,
        projectName: proj ? proj.name : '',
        submittedBy: user.id,
        submittedName: user.name,
        date: reportDate,
        progress: Number(progress),
        status: 'In Progress',
        workDone: workDone.trim(),
        issues: issues.trim(),
        priority: issuePriority || 'Low',
        materials: validMaterials,
        photos: uploadedPhotos.length,
        photoUrls: uploadedPhotos,
        photoDescription: photoDesc.trim(),
        remarks: remarks.trim()
      });

      // Update project progress if greater
      if (proj && Number(progress) > (proj.progress || 0)) {
        await api.updateProject(projectId, {
          progress: Number(progress),
          status: Number(progress) >= 100 ? 'Completed' : 'In Progress'
        });
      }

      // Notify project manager
      if (proj && proj.managerId) {
        await api.createNotification({
          userId: proj.managerId,
          type: 'report',
          title: 'New Site Report',
          body: `${user.name} submitted ${newReport.title} for ${newReport.projectName}`
        });
      }

      setIsSuccessOpen(true);
    } catch (err) {
      setErrors({ form: err.message || 'Report could not be submitted' });
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Submit Site Report</h1>
        <p className="page-subtitle">Document daily progress, materials used, and site photos</p>
      </div>

      <form onSubmit={handleSubmit}>
        {errors.form && (
          <div className="error-alert" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {errors.form}
          </div>
        )}

        {/* Section 1: Daily Work Progress */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div className="icon-box icon-box-orange">
              <FileText size={18} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Daily Work Progress</h3>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Project <span className="req">*</span></label>
              <select
                className={`form-select ${errors.projectId ? 'input-error' : ''}`}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId && <span className="field-error">{errors.projectId}</span>}
              {projectId && (() => {
                const projTasks = engineerTasks.filter((t) => t.projectId === projectId);
                if (projTasks.length > 0) {
                  return (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, background: 'var(--bg)', padding: '6px 10px', borderRadius: '4px' }}>
                      <strong style={{ color: 'var(--primary)' }}>Your Tasks in this Project ({projTasks.length}):</strong>{' '}
                      {projTasks.map((t) => `${t.title} (${t.progress || 0}%)`).join(', ')}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="form-group">
              <label className="form-label">Date <span className="req">*</span></label>
              <input
                type="date"
                className={`form-input ${errors.reportDate ? 'input-error' : ''}`}
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
              {errors.reportDate && <span className="field-error">{errors.reportDate}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Work Completed Today <span className="req">*</span></label>
            <textarea
              className={`form-textarea ${errors.workDone ? 'input-error' : ''}`}
              placeholder="Describe the work completed today..."
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
            />
            <span className="form-hint">Max 1000 characters</span>
            {errors.workDone && <span className="field-error">{errors.workDone}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Overall Progress (%) <span className="req">*</span></label>
            <input
              type="number"
              className={`form-input ${errors.progress ? 'input-error' : ''}`}
              min="0"
              max="100"
              placeholder="e.g., 75"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
            />
            {errors.progress && <span className="field-error">{errors.progress}</span>}
          </div>
        </div>

        {/* Section 2: Issues & Challenges */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div className="icon-box icon-box-red">
              <AlertTriangle size={18} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Issues & Challenges</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Issues Encountered</label>
            <textarea
              className={`form-textarea ${errors.issues ? 'input-error' : ''}`}
              placeholder="Describe any issues or challenges faced today (leave blank if none)..."
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
            />
            <span className="form-hint">Max 500 characters</span>
            {errors.issues && <span className="field-error">{errors.issues}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={issuePriority}
              onChange={(e) => setIssuePriority(e.target.value)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        {/* Section 3: Additional Remarks */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div className="icon-box icon-box-blue">
              <Edit3 size={18} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Additional Remarks</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Remarks / Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Any additional notes or observations..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>

        {/* Section 4: Materials Used */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="icon-box icon-box-green">
                <Wrench size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Materials Used</h3>
            </div>
            <Button variant="secondary" size="sm" type="button" onClick={addMaterialRow}>
              + Add Material
            </Button>
          </div>

          {errors.materials && (
            <div className="error-alert" style={{ marginBottom: '12px' }}>
              {errors.materials}
            </div>
          )}

          <div>
            {materials.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  gap: '10px',
                  marginBottom: '10px',
                  alignItems: 'end'
                }}
              >
                <div>
                  <label className="form-label">Material Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Cement"
                    value={m.name}
                    onChange={(e) => updateMaterial(idx, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g., 50"
                    min="0"
                    value={m.qty}
                    onChange={(e) => updateMaterial(idx, 'qty', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Unit</label>
                  <select
                    className="form-select"
                    value={m.unit}
                    onChange={(e) => updateMaterial(idx, 'unit', e.target.value)}
                  >
                    <option value="">Select unit</option>
                    <option value="bags">bags</option>
                    <option value="kg">kg</option>
                    <option value="tons">tons</option>
                    <option value="cubic meters">cubic meters</option>
                    <option value="liters">liters</option>
                    <option value="meters">meters</option>
                    <option value="pieces">pieces</option>
                  </select>
                </div>
                <div>
                  <Button
                    variant="danger"
                    size="sm"
                    type="button"
                    onClick={() => removeMaterialRow(idx)}
                    disabled={materials.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Upload Photos */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div className="icon-box icon-box-purple">
              <Camera size={18} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Upload Site Photos</h3>
          </div>

          <label
            htmlFor="photo-file-input"
            className="upload-zone"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '28px',
              border: '2px dashed var(--border)',
              borderRadius: '10px',
              cursor: 'pointer',
              background: 'var(--bg)',
              opacity: isUploading ? 0.6 : 1
            }}
          >
            <div style={{ color: 'var(--primary)', marginBottom: '8px' }}>
              <UploadCloud size={36} style={{ margin: '0 auto' }} />
            </div>
            <p><strong>Click to upload site photos</strong></p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              PNG, JPG, WebP up to 5MB each · Max 10 files
            </p>
            <input
              id="photo-file-input"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
              disabled={isUploading}
            />
          </label>

          {uploadStatus && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
              {uploadStatus}
            </div>
          )}

          {uploadedPhotos.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
              {uploadedPhotos.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                  <img
                    src={url.startsWith('http') || url.startsWith('blob:') ? url : `http://localhost:3000${url}`}
                    alt={`Upload ${idx + 1}`}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--emerald-500, #10b981)' }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: 'var(--red)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label">Photo Description (Optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Add context or notes for the site photos..."
              style={{ minHeight: '60px' }}
              value={photoDesc}
              onChange={(e) => setPhotoDesc(e.target.value)}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="primary" type="submit" style={{ padding: '12px 24px' }}>
            <Send size={16} style={{ marginRight: '6px' }} /> Submit Report
          </Button>
        </div>
      </form>

      {/* Success Modal */}
      {isSuccessOpen && (
        <Modal
          isOpen={isSuccessOpen}
          title=""
          onClose={() => {
            setIsSuccessOpen(false);
            navigate('/site-engineer/dashboard');
          }}
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              className="icon-box icon-box-green icon-box-lg"
              style={{ margin: '0 auto 16px', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Report Submitted Successfully!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Your site report has been submitted and the project manager has been notified.
            </p>
            <Button
              variant="success"
              style={{ width: '100%' }}
              onClick={() => {
                setIsSuccessOpen(false);
                navigate('/site-engineer/dashboard');
              }}
            >
              Return to Dashboard
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
