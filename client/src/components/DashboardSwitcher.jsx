import { useLocation, useNavigate } from "react-router-dom";

const DASHBOARD_OPTIONS = [
  { value: "/admin", label: "Admin Dashboard" },
  { value: "/teacher-dashboard", label: "Teacher Dashboard" },
  { value: "/prayer-team-dashboard", label: "Prayer Team Dashboard" },
  { value: "/pastor-dashboard", label: "Pastor Dashboard" },
];

export default function DashboardSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentValue = DASHBOARD_OPTIONS.some((item) => item.value === location.pathname)
    ? location.pathname
    : "/admin";

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
        {DASHBOARD_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
