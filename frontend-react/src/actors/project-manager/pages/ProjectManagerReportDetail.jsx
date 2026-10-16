import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatDate,
  statusBadge,
  priorityBadge
} from '../../../services/utils';
import Button from '../../../components/common/Button';

export default function ProjectManagerReportDetail() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get('id');
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [report, setReport] = useState(null);

  useEffect(() => {
    loadReport();
  }, [id, user]);

  async function loadReport() {
    if (!id || !user) return;
    const allReports = await api.getReports(user.companyId);
    const found = (allReports || []).find((r) => r.id === id);
    setReport(found || null);
  }

  if (!report) {
    return (
      <div className="page-container">
        <button
          onClick={() => navigate('/project-manager/reports')}
          className="back-btn"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} /> Back to Reports
        </button>
        <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '40px' }}>
          <h3>Report not found</h3>
          <p style={{ color: 'var(--text-muted)' }}>The site report could not be found.</p>
        </div>
      </div>
    );
  }

  const photoUrls = Array.isArray(report.photoUrls) ? report.photoUrls : [];
  const photoCount = photoUrls.length || report.photos || 0;

  return (
    <div className="page-container">
      <button
        onClick={() => navigate('/project-manager/reports')}
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
        <ArrowLeft size={16} /> Back to Reports
      </button>

      {/* Header */}
      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">{report.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span className={`badge ${statusBadge(report.status)}`}>{report.status}</span>
            {report.priority && (
              <span className={`badge ${priorityBadge(report.priority)}`}>{report.priority}</span>
            )}
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate('/project-manager/reports')}>
          ← All Reports
        </Button>
      </div>

      {/* Overview Grid */}
      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div className="detail-section card">
          <h3 style={{ marginBottom: '14px' }}>Report Information</h3>
          <div className="detail-grid">
            <div className="detail-item"><label>Report ID</label><span>{report.id}</span></div>
            <div className="detail-item"><label>Project</label><span>{report.projectName || 'Apex Skyline Tower'}</span></div>
            <div className="detail-item"><label>Submitted By</label><span>{report.submittedName || report.reporterName || 'Priya Sharma (Site Engineer)'}</span></div>
            <div className="detail-item"><label>Date</label><span>{formatDate(report.date)}</span></div>
            <div className="detail-item"><label>Status</label><span><span className={`badge ${statusBadge(report.status)}`}>{report.status}</span></span></div>
            <div className="detail-item">
              <label>Photos</label>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Camera size={14} /> {photoCount} photos
              </span>
            </div>
          </div>
        </div>

        <div className="detail-section card">
          <h3 style={{ marginBottom: '14px' }}>Progress</h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Reported Progress</span>
              <span style={{ fontWeight: 700, fontSize: '22px', color: 'var(--primary)' }}>{report.progress || 0}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${report.progress || 0}%` }}></div>
            </div>
          </div>
          {report.priority && (
            <div className="detail-item">
              <label>Issue Priority</label>
              <span><span className={`badge ${priorityBadge(report.priority)}`}>{report.priority}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Work Done */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '10px' }}>Work Completed</h3>
        <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-muted)' }}>
          {report.workDone || 'No details provided.'}
        </p>
      </div>

      {/* Issues & Challenges */}
      {report.issues && (
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--orange)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--orange)' }}>
            <AlertTriangle size={18} /> Issues & Challenges
          </h3>
          <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-muted)' }}>
            {report.issues}
          </p>
        </div>
      )}

      {/* Remarks */}
      {report.remarks && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '10px' }}>Additional Remarks</h3>
          <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-muted)' }}>
            {report.remarks}
          </p>
        </div>
      )}

      {/* Materials Used */}
      {Array.isArray(report.materials) && report.materials.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '12px' }}>Materials Used</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {report.materials.map((m, idx) => (
                  <tr key={idx}>
                    <td><strong>{m.name}</strong></td>
                    <td>{m.qty}</td>
                    <td>{m.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Site Photos */}
      <div className="card">
        <h3 style={{ marginBottom: '14px' }}>Site Photos</h3>
        {photoUrls.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No photos uploaded with this report.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {photoUrls.map((url, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)'
                }}
              >
                <img
                  src={url.startsWith('http') ? url : `http://localhost:3000${url}`}
                  alt={`Site photo ${idx + 1}`}
                  style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<div style="height:140px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;">Photo ${idx + 1}</div>`;
                  }}
                />
              </div>
            ))}
          </div>
        )}
        {report.photoDescription && (
          <p style={{ marginTop: '12px', fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Note: {report.photoDescription}
          </p>
        )}
      </div>
    </div>
  );
}
