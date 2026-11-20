import { useEffect, useState } from 'react';
import { api, API_ORIGIN } from '../../services/api';
import { formatDate } from '../../services/utils';
import Modal from './Modal';

const field = (label, value) => (
  <div>
    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 12 }}>{label}</span>
    <strong>{value === undefined || value === null || value === '' ? '-' : value}</strong>
  </div>
);

/** Read-only preview of one site report: what was done, weather, workers, material used and photos. */
export default function ReportPreviewModal({ reportId, onClose }) {
  const [loaded, setLoaded] = useState(null); // { id, report?, error? }

  useEffect(() => {
    if (!reportId) return;
    let live = true;
    api.getReport(reportId).then((res) => {
      if (live) setLoaded(res && res.error ? { id: reportId, error: res.message } : { id: reportId, report: res });
    });
    return () => { live = false; };
  }, [reportId]);

  const current = loaded && loaded.id === reportId ? loaded : null;
  const r = current?.report;
  const photos = Array.isArray(r?.photoUrls) ? r.photoUrls : [];
  const materials = Array.isArray(r?.materials) ? r.materials : [];

  return (
    <Modal isOpen={!!reportId} onClose={onClose} title={r?.title || 'Site report'} subtitle={r ? `${r.projectName || ''} \u00b7 ${formatDate(r.date)}` : ''} size="lg"
      footer={<button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>}>
      {!current ? <p>Loading...</p> : current.error ? <div className="error-msg" style={{ display: 'block' }}>{current.error}</div> : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 14 }}>
            {field('Date', r.date ? formatDate(r.date) : '')}
            {field('Milestone', r.milestoneName)}
            {field('Task', r.taskTitle)}
            {field('Weather', r.weather)}
            {field('Workers on site', r.laborCount)}
            {field('Submitted by', r.reporterName || r.submittedName)}
          </div>
          <h4 style={{ margin: '0 0 6px' }}>Work done</h4>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 0, whiteSpace: 'pre-wrap' }}>{r.workDone || '-'}</p>
          {r.issues && r.issues !== 'None.' && (<><h4 style={{ margin: '12px 0 6px' }}>Issues</h4><p style={{ fontSize: 13.5, marginTop: 0 }}>{r.issues}</p></>)}
          <h4 style={{ margin: '12px 0 6px' }}>Materials used</h4>
          {materials.length === 0 ? <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 0 }}>None reported.</p> : (
            <table className="data-table"><thead><tr><th>Material</th><th style={{ textAlign: 'right' }}>Quantity</th><th>Unit</th></tr></thead>
              <tbody>{materials.map((m, i) => <tr key={i}><td>{m.name}</td><td style={{ textAlign: 'right' }}>{m.qty}</td><td>{m.unit}</td></tr>)}</tbody></table>
          )}
          <h4 style={{ margin: '12px 0 6px' }}>Photos</h4>
          {photos.length === 0 ? <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 0 }}>No photos attached.</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {photos.map((url, i) => (
                <img key={i} src={String(url).startsWith('/') ? `${API_ORIGIN}${url}` : url} alt={`Site photo ${i + 1}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--radius)' }} />
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
