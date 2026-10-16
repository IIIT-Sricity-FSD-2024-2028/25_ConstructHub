import { FileText, ClipboardList } from "lucide-react";

export default function RecentActivity({ tasks, reports }) {
  const activities = [
    ...tasks.slice(0, 3).map((task) => ({
      type: "Task",
      title: task.title || task.name || "Task updated",
      status: task.status || "Updated",
    })),

    ...reports.slice(0, 3).map((report) => ({
      type: "Report",
      title: report.title || "Site report submitted",
      status: "Submitted",
    })),
  ];

  return (
    <div className="activity-card">
      <div className="section-heading">
        <h2>Recent Activity</h2>
      </div>

      {activities.length === 0 ? (
        <div className="empty-state">
          No recent activity
        </div>
      ) : (
        activities.map((activity, index) => {
          const Icon =
            activity.type === "Task"
              ? ClipboardList
              : FileText;

          return (
            <div className="activity-item" key={index}>
              <div className="activity-icon">
                <Icon size={18} />
              </div>

              <div className="activity-content">
                <strong>{activity.title}</strong>
                <span>{activity.status}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}