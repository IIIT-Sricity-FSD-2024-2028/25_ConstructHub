import { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector, useLoad, errorText } from '../../../store/hooks';
import { fetchProjects, updateProject, selectReportProjects } from '../../../features/projects/projectsSlice';
import { fetchTasks, selectTasksAssignedTo } from '../../../features/tasks/tasksSlice';
import { fetchProjectProgress, selectProjectProgress } from '../../../features/milestones/milestonesSlice';
import { createReport, uploadReportPhotos, fetchStockAvailable, selectStockAvailable } from '../../../features/reports/reportsSlice';
import { sendNotification } from '../../../features/notifications/notificationsSlice';
import { useToast } from '../../../hooks/useToast';
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
import { API_ORIGIN } from '../../../services/api';
import { formatDate, localDateISO } from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function SiteEngineerSubmitReport() {
  const toast = useToast();
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  // Reports can only be filed for projects where this engineer still has unfinished work (enforced by the server too).
  const projects = useAppSelector(selectReportProjects);
  const engineerTasks = useAppSelector((state) => selectTasksAssignedTo(state, user?.id));
  useLoad([fetchProjects, fetchTasks]);

  // Form State
  const [pickedProjectId, setPickedProjectId] = useState('');
  const projectId = pickedProjectId || projects[0]?.id || '';
  const [reportDate, setReportDate] = useState(localDateISO());
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

  // Milestone projects: the report is tied to a milestone (and task), records weather and labor.
  // Every project: material can only be declared from what Site Stock issued to this engineer. Progress is not typed in.
  const progressData = useAppSelector((state) => selectProjectProgress(state, projectId));
  const milestones = useMemo(() => (progressData?.milestones || []).filter((m) => m.status !== 'Completed'), [progressData]);
  const stockItems = useAppSelector((state) => selectStockAvailable(state, projectId));
  const availableStock = stockItems.filter((i) => i.available > 0);
  const [milestoneId, setMilestoneId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [weather, setWeather] = useState('');
  const [laborCount, setLaborCount] = useState('');
  const milestoneMode = milestones.length > 0;
  useLoad([projectId && [fetchProjectProgress, projectId], projectId && [fetchStockAvailable, projectId]], [projectId]);

  // Switching project clears the parts of the form that belonged to the old one.
  function setProjectId(id) {
    setPickedProjectId(id);
    setMilestoneId('');
    setTaskId('');
    setMaterials([{ name: '', qty: '', unit: '' }]);
  }

  const milestoneTasks = engineerTasks.filter((t) => t.projectId === projectId && t.milestoneId === milestoneId);
  const linkedProgress = (() => {
    if (taskId) return Number(engineerTasks.find((t) => t.id === taskId)?.progress) || 0;
    return Number(milestones.find((m) => m.id === milestoneId)?.progress) || 0;
  })();

  function pickStock(index, key) {
    const hit = stockItems.find((i) => `${i.description}|${i.unit}` === key);
    const updated = [...materials];
    updated[index] = { name: hit ? hit.description : '', unit: hit ? hit.unit : '', qty: '' };
    setMaterials(updated);
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
      toast.error('Maximum 10 photos allowed per report.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading photos...');

    try {
      let result;
      try {
        result = await dispatch(uploadReportPhotos(files)).unwrap();
      } catch (err) {
        // Never attach browser-only links: they would be broken for everyone else who opens the report.
        setUploadStatus('');
        toast.error(errorText(err, 'Photos could not be uploaded. Please try again.'));
        return;
      }
      const urls = result.photoUrls || [];
      setUploadedPhotos([...uploadedPhotos, ...urls]);
      setUploadStatus(`${result.count || urls.length} photo(s) uploaded successfully.`);
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

    if (milestoneMode) {
      if (!milestoneId) errs.milestoneId = 'Select the milestone this report belongs to';
      if (!weather) errs.weather = 'Select the site weather';
      if (laborCount === '' || !Number.isInteger(Number(laborCount)) || Number(laborCount) < 0) errs.laborCount = 'Enter the number of workers on site';
    } else if (progress === '') {
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
      const newReport = await dispatch(createReport({
        title: `Site Report - ${formatDate(reportDate)}`,
        projectId: projectId,
        projectName: proj ? proj.name : '',
        submittedBy: user.id,
        submittedName: user.name,
        date: reportDate,
        progress: milestoneMode ? linkedProgress : Number(progress),
        ...(milestoneMode ? { milestoneId, taskId: taskId || undefined, weather, laborCount: Number(laborCount) } : {}),
        status: 'In Progress',
        workDone: workDone.trim(),
        issues: issues.trim(),
        priority: issuePriority || 'Low',
        materials: validMaterials,
        photos: uploadedPhotos.length,
        photoUrls: uploadedPhotos,
        photoDescription: photoDesc.trim(),
        remarks: remarks.trim()
      })).unwrap();

      // Projects without milestones still use the typed progress. Milestone projects calculate it from tasks.
      if (!milestoneMode && proj && Number(progress) > (proj.progress || 0)) {
        // Only the progress figure is reported; the project manager decides when the project is completed.
        await dispatch(updateProject({ id: projectId, changes: { progress: Number(progress) } }));
      }

      // Notify project manager
      if (proj && proj.managerId) {
        dispatch(sendNotification({
          userId: proj.managerId,
          type: 'report',
          title: 'New Site Report',
          body: `${user.name} submitted ${newReport.title} for ${newReport.projectName}`
        }));
      }

      dispatch(fetchStockAvailable(projectId)); // the reported material is no longer available
      setIsSuccessOpen(true);
    } catch (err) {
      setErrors({ form: errorText(err, 'Report could not be submitted') });
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
              {projects.length === 0 && (
                <span className="form-hint">You have no unfinished tasks, so there is no project to report on. Your project manager assigns tasks.</span>
              )}
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

          {milestoneMode ? (
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Milestone <span className="req">*</span></label>
                  <select className={`form-select ${errors.milestoneId ? 'input-error' : ''}`} value={milestoneId} onChange={(e) => { setMilestoneId(e.target.value); setTaskId(''); }}>
                    <option value="">Select milestone</option>
                    {milestones.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.progress}%)</option>)}
                  </select>
                  {errors.milestoneId && <span className="field-error">{errors.milestoneId}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Task</label>
                  <select className="form-select" value={taskId} disabled={!milestoneId} onChange={(e) => setTaskId(e.target.value)}>
                    <option value="">{milestoneId ? 'Whole milestone' : 'Select a milestone first'}</option>
                    {milestoneTasks.map((t) => <option key={t.id} value={t.id}>{t.title} ({t.progress || 0}%)</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Weather <span className="req">*</span></label>
                  <select className={`form-select ${errors.weather ? 'input-error' : ''}`} value={weather} onChange={(e) => setWeather(e.target.value)}>
                    <option value="">Select weather</option>
                    {['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Hot', 'Cold', 'Foggy'].map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                  {errors.weather && <span className="field-error">{errors.weather}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Workers on site <span className="req">*</span></label>
                  <input type="number" min="0" step="1" className={`form-input ${errors.laborCount ? 'input-error' : ''}`} value={laborCount} onChange={(e) => setLaborCount(e.target.value)} />
                  {errors.laborCount && <span className="field-error">{errors.laborCount}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Progress</label>
                <div style={{ fontSize: 14 }}><strong>{linkedProgress}%</strong> <span style={{ color: 'var(--text-muted)' }}>(calculated from {taskId ? 'the task' : 'the milestone tasks'}; update it from Update Task Status)</span></div>
              </div>
            </div>
          ) : (
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
          )}
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

        {/* Section 4: Materials Used (only what Site Stock issued to this engineer, on every project) */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="icon-box icon-box-green">
                <Wrench size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
                {availableStock.length > 0 ? 'Materials Consumed (from your Site Stock issues)' : 'Materials Consumed'}
              </h3>
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

          {availableStock.length === 0 ? (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px 0' }} data-testid="no-issued-stock">
                No issued Site Stock is currently pending on this project — you can log materials used manually below.
              </p>
              {materials.map((m, idx) => (
                <div key={idx} className="report-material-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
                  <div>
                    <label className="form-label">Material name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Cement, Steel Rods"
                      value={m.name}
                      onChange={(e) => updateMaterial(idx, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      step="any"
                      placeholder="0"
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
                      <option value="Bags">Bags</option>
                      <option value="Tons">Tons</option>
                      <option value="Cubic Meters">Cubic Meters</option>
                      <option value="Kg">Kg</option>
                      <option value="Meters">Meters</option>
                      <option value="Liters">Liters</option>
                      <option value="Pieces">Pieces</option>
                      <option value="Boxes">Boxes</option>
                    </select>
                  </div>
                  <div>
                    <Button variant="danger" size="sm" type="button" onClick={() => removeMaterialRow(idx)} disabled={materials.length <= 1}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {materials.map((m, idx) => {
                const hit = stockItems.find((i) => i.description === m.name && i.unit === m.unit);
                return (
                  <div key={idx} className="report-material-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
                    <div>
                      <label className="form-label">Issued material</label>
                      <select className="form-select" value={hit ? `${hit.description}|${hit.unit}` : ''} onChange={(e) => pickStock(idx, e.target.value)}>
                        <option value="">Select material</option>
                        {availableStock.map((i) => <option key={`${i.description}|${i.unit}`} value={`${i.description}|${i.unit}`}>{i.description} ({i.unit}) - {i.available} available</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Quantity used</label>
                      <input type="number" className="form-input" min="0" max={hit ? hit.available : undefined} step="any" value={m.qty} disabled={!hit} onChange={(e) => updateMaterial(idx, 'qty', e.target.value)} />
                    </div>
                    <div>
                      <Button variant="danger" size="sm" type="button" onClick={() => removeMaterialRow(idx)} disabled={materials.length <= 1}>Remove</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                    src={url.startsWith('http') || url.startsWith('blob:') ? url : `${API_ORIGIN}${url}`}
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
