import React, { useState, useEffect } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  File,
  Package,
  Users,
  CheckCircle2,
  Camera,
  Eye,
  RefreshCw
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatDate,
  statusBadge
} from '../../../services/utils';
import Button from '../../../components/common/Button';

export default function ProjectManagerReports() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeFilter, setActiveFilter] = useState('');

  useEffect(() => {
    loadReports();
  }, [user]);

  async function loadReports() {
    if (!user) return;
    const [allProjects, allReports] = await Promise.all([
      api.getProjects(user.companyId),
      api.getReports(user.companyId)
    ]);

    const myProjects = (allProjects || []).filter(
      (p) => p.managerId === user.id || !p.managerId || user.role === 'superuser'
    );
    setProjects(myProjects);

    const myProjectIds = myProjects.map((p) => p.id);
    const myReports = (allReports || []).filter((r) => myProjectIds.includes(r.projectId));
    myReports.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    setReports(myReports);
  }

  const filteredReports = activeFilter
    ? reports.filter((r) => r.status === activeFilter)
    : reports;

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">View Site Reports</h1>
        <p className="page-subtitle">View all submitted site reports and track site progress</p>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Button
          variant={activeFilter === '' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveFilter('')}
        >
          All Reports
        </Button>
        <Button
          variant={activeFilter === 'Completed' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveFilter('Completed')}
        >
          Completed
        </Button>
        <Button
          variant={activeFilter === 'In Progress' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setActiveFilter('In Progress')}
        >
          In Progress
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadReports}
        >
          <RefreshCw size={13} style={{ marginRight: '4px' }} /> Refresh
        </Button>

        <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-muted)' }}>
          Showing {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Reports List */}
      <div id="reports-list">
        {filteredReports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FileText size={32} /></div>
            <h3>No reports found</h3>
            <p>Site engineers haven't submitted any reports yet.</p>
          </div>
        ) : (
          filteredReports.map((r) => {
            const photoCount = (Array.isArray(r.photoUrls) ? r.photoUrls.length : r.photos) || 0;
            return (
              <div key={r.id} className="card" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 }}>
                    <div
                      style={{
                        background: 'var(--primary-light)',
                        padding: '10px',
                        borderRadius: '8px',
                        color: 'var(--primary)',
                        flexShrink: 0
                      }}
                    >
                      <File size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '15px' }}>{r.title}</strong>
                        <span className={`badge ${statusBadge(r.status)}`}>{r.status}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '16px',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginBottom: '8px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Package size={14} /> {r.projectName}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={14} /> {r.submittedName}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} /> {formatDate(r.date)}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Camera size={14} /> {photoCount} photos
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Progress: <strong style={{ color: 'var(--primary)' }}>{r.progress || 0}%</strong>
                      </div>
                      <div className="progress-bar" style={{ maxWidth: '300px' }}>
                        <div className="progress-bar-fill" style={{ width: `${r.progress || 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/project-manager/reports/${r.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0, marginLeft: '12px' }}
                  >
                    <Eye size={14} style={{ marginRight: '4px' }} /> View Details
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
