import {
  FolderKanban,
  CheckCircle2,
  Clock3,
  Wallet,
} from "lucide-react";

const icons = {
  projects: FolderKanban,
  completed: CheckCircle2,
  schedule: Clock3,
  budget: Wallet,
};

export default function StatCard({
  title,
  value,
  type,
}) {
  const Icon =
    icons[type] || FolderKanban;

  return (
    <div className="stat-card">

      <div className="stat-icon">
        <Icon size={22} />
      </div>

      <div>
        <p className="stat-title">
          {title}
        </p>

        <h2>
          {value}
        </h2>
      </div>

    </div>
  );
}