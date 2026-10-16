import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FileText,
  Camera,
  Calendar,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatDate,
  statusBadge
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function ClientReports() {
  const { user } = useOutletContext();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    loadReports();
  }, [user]);

  async function loadReports() {
    if (!user) return;
    const [allProjects, allReports] = await Promise.all([
      api.getProjects(user.companyId),
      api.getReports(user.companyId)
    ]);

    const myProj = (allProjects || []).find(
      (p) => p.clientId === user.id || p.clientEmail === user.email || p.clientName === user.name
    );

    if (myProj) {
      const projReports = (allReports || []).filter((r) => r.projectId === myProj.id);
      projReports.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setReports(projReports);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Site Reports & Inspections</h1>
        <p className="page-subtitle">Track daily site progress, inspections, and verified construction photos</p>
      </div>

      <div className="card">
        <div className="section-title" style={{ marginBottom: '14px' }}>Submitted Reports</div>
        {reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FileText size={32} /></div>
            <p>No site reports have been logged for your project yet.</p>
          </div>
        ) : (
          reports.map((r) => {
            const photoCount = (Array.isArray(r.photoUrls) ? r.photoUrls.length : r.photos) || 0;
            return (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '15px' }}>{r.title}</strong>
                    <span className={`badge ${statusBadge(r.status)}`}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    Date: {formatDate(r.date)} · Progress: {r.progress}% · {photoCount} photo(s)
                  </div>
                  {r.workDone && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {r.workDone.length > 90 ? r.workDone.substring(0, 90) + '...' : r.workDone}
                    </div>
                  )}
                </div>
                <div>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedReport(r)}>
                    <Eye size={14} style={{ marginRight: '4px' }} /> View Report
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Report Modal */}
      {selectedReport && (
        <Modal
          isOpen={!!selectedReport}
          title={selectedReport.title}
          subtitle={`Submitted by ${selectedReport.submittedName || selectedReport.reporterName || 'Priya Sharma (Site Engineer)'} on ${formatDate(selectedReport.date)}`}
          onClose={() => setSelectedReport(null)}
        >
          <div className="detail-grid" style={{ marginBottom: '16px' }}>
            <div className="detail-item"><label>Report ID</label><span>{selectedReport.id}</span></div>
            <div className="detail-item"><label>Project</label><span>{selectedReport.projectName || 'Apex Skyline Tower'}</span></div>
            <div className="detail-item"><label>Progress</label><span style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedReport.progress || 75}%</span></div>
            <div className="detail-item"><label>Date</label><span>{formatDate(selectedReport.date)}</span></div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
              Work Completed
            </div>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-muted)', background: 'var(--bg)', padding: '10px', borderRadius: '6px' }}>
              {selectedReport.workDone || 'Daily site log and physical construction completed as per project specifications.'}
            </p>
          </div>

          {selectedReport.remarks && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                Additional Remarks
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-muted)', background: 'var(--bg)', padding: '10px', borderRadius: '6px' }}>
                {selectedReport.remarks}
              </p>
            </div>
          )}

          {Array.isArray(selectedReport.photoUrls) && selectedReport.photoUrls.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>
                Site Photos
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {selectedReport.photoUrls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url.startsWith('http') || url.startsWith('blob:') ? url : `http://localhost:3000${url}`}
                    alt={`Photo ${idx + 1}`}
                    style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <Button variant="secondary" onClick={() => setSelectedReport(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
