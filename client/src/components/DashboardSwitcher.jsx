import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DASHBOARD_OPTIONS = [
  { value: "/admin", label: "Admin Dashboard", roles: ["admin", "leader"] },
  { value: "/teacher-dashboard", label: "Teacher Dashboard", roles: ["teacher", "admin", "pastor", "leader"] },
  { value: "/prayer-team-dashboard", label: "Submitted Prayer Requests", roles: ["prayer_team", "admin", "pastor", "leader"] },
  { value: "/pastor-dashboard", label: "Pastor Dashboard", roles: ["pastor", "leader"] },
  { value: "/contact-submissions", label: "Contact Submissions", roles: ["pastor", "admin", "leader"] },
];

export default function DashboardSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const normalizedRole = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const availableOptions = DASHBOARD_OPTIONS.filter((item) => {
    if (!Array.isArray(item.roles) || item.roles.length === 0) {
      return true;
    }

    return item.roles.includes(normalizedRole);
  });

  const fallbackValue = availableOptions[0]?.value || "";

  if (availableOptions.length <= 1) {
    return null;
  }

  const currentValue = availableOptions.some((item) => item.value === location.pathname)
    ? location.pathname
    : fallbackValue;

  return (
    <div className="mb-5 w-full sm:w-80">
      <label htmlFor="dashboard-switcher" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        Switch Dashboard
      </label>
      <select
        id="dashboard-switcher"
        value={currentValue}
        onChange={(e) => navigate(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-[#15436b] font-medium focus:ring-2 focus:ring-[#15436b] focus:border-transparent"
      >
        {availableOptions.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
