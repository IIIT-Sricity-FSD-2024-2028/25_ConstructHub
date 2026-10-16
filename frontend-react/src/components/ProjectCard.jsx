import { CalendarDays, ArrowRight } from "lucide-react";

export default function ProjectCard({ project }) {
  const progress = Number(project.progress ?? project.progressPercentage ?? 0);

  return (
    <div className="project-card">
      <div className="project-card-header">
        <div>
          <h3>{project.name || project.projectName}</h3>

          <span className={`status ${String(project.status || "").toLowerCase()}`}>
            {project.status || "Active"}
          </span>
        </div>
      </div>

      <p className="project-description">
        {project.description || "No project description available."}
      </p>

      <div className="project-date">
        <CalendarDays size={16} />

        <span>
          {project.startDate
            ? new Date(project.startDate).toLocaleDateString()
            : "Start date unavailable"}
        </span>
      </div>

      <div className="progress-section">
        <div className="progress-label">
          <span>Progress</span>
          <strong>{progress}%</strong>
        </div>

        <div className="progress-bar">
          <div
            className="progress-value"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      </div>

      <button className="view-project">
        View Project
        <ArrowRight size={16} />
      </button>
    </div>
  );
}