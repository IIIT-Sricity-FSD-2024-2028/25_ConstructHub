import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  FileText,
  MessageSquare,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/project-manager/dashboard",
  },
  {
    label: "Projects",
    icon: FolderKanban,
    path: "/project-manager/projects",
  },
  {
    label: "Tasks",
    icon: ClipboardList,
    path: "/project-manager/tasks",
  },
  {
    label: "Reports",
    icon: FileText,
    path: "/project-manager/reports",
  },
  {
    label: "Messages",
    icon: MessageSquare,
    path: "/project-manager/messages",
  },
  {
    label: "Settings",
    icon: Settings,
    path: "/project-manager/settings",
  },
];

export default function Sidebar() {
  function navigate(path) {
    window.location.href = path;
  }

  return (
    <aside className="sidebar">

      <nav>

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.label}
              className={`sidebar-item ${
                item.label === "Dashboard"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                navigate(item.path)
              }
            >
              <Icon size={19} />

              <span>
                {item.label}
              </span>
            </button>
          );
        })}

      </nav>

    </aside>
  );
}