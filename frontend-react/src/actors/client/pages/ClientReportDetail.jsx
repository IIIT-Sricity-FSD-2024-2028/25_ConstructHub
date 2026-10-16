import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, FileText, Camera, AlertTriangle } from 'lucide-react';
import { api } from '../../../services/api';
import { formatDate, statusBadge, priorityBadge } from '../../../services/utils';

export default function ClientReportDetail() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get('id');
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [id, user]);

  async function loadReport() {
    if (!id || !user) return;
    setLoading(true);
    const allReports = await api.getReports(user.companyId);
    const found = (allReports || []).find((r) => r.id === id);
    setReport(found || null);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading report details...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="page-container">
        <button
          onClick={() => navigate('/client/reports')}
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
        onClick={() => navigate('/client/reports')}
        className="back-btn"
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', marginBottom: '16px' }}
      >
        <ArrowLeft size={16} /> Back to Reports
      </button>

      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 700, margin: 0 }}>
            {report.title}
          </h1>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <span className={`badge ${statusBadge(report.status)}`}>{report.status}</span>
            {report.priority && <span className={`badge ${priorityBadge(report.priority)}`}>{report.priority}</span>}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div className="card">
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Report Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', fontSize: '13.5px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Report ID</span>
              <strong>{report.id}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Project</span>
              <strong>{report.projectName || 'Infrastructure Milestone Project'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Submitted By</span>
              <strong>{report.reporterName || report.submittedName || 'Site Field Engineer'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Date</span>
              <strong>{formatDate(report.date)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Status</span>
              <span className={`badge ${statusBadge(report.status)}`}>{report.status}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Photos</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Camera size={14} /> {photoCount}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Progress</h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Overall Progress</span>
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '22px', color: 'var(--primary)' }}>
                {report.progress || 0}%
              </span>
            </div>
            <div className="progress-track" style={{ background: 'var(--border, #e5e7eb)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div className="progress-fill" style={{ width: `${report.progress || 0}%`, background: 'var(--primary, #f97316)', height: '100%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Work Completed</h3>
        <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text)', margin: 0 }}>
          {report.workDone || report.description || 'Milestone inspection and structural progression completed according to project architectural plans.'}
        </p>
      </div>

      {report.issues && (
        <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid var(--orange, #f97316)' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={18} color="var(--orange, #f97316)" /> Issues & Challenges
          </h3>
          <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text)', margin: 0 }}>
            {report.issues}
          </p>
        </div>
      )}

      {report.materials && report.materials.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Materials Used</h3>
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
                    <td>{m.name}</td>
                    <td>{m.qty}</td>
                    <td>{m.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {photoUrls.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Site Photos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {photoUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Site photo ${idx + 1}`}
                style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: 'var(--radius)' }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
