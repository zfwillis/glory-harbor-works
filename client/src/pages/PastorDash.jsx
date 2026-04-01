import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardSwitcher from "../components/DashboardSwitcher";

export default function PastorDash() {
  const { user, token } = useAuth();

  const sections = [
    {
      title: "Admin Panel",
      description: "View and manage all user accounts and roles.",
      to: "/admin",
      btnLabel: "Open Admin Panel",
      color: "border-red-200",
      badge: "bg-red-100 text-red-700",
      badgeText: "Role Management",
    },
    {
      title: "Teacher Hub",
      description: "Manage sermons, lessons, and teaching content.",
      to: "/teacher-dashboard",
      btnLabel: "Open Teacher Hub",
      color: "border-blue-200",
      badge: "bg-blue-100 text-blue-700",
      badgeText: "Sermons",
    },
    {
      title: "Prayer Team Hub",
      description: "Review all prayer requests and update their status.",
      to: "/prayer-team-dashboard",
      btnLabel: "Open Prayer Hub",
      color: "border-green-200",
      badge: "bg-green-100 text-green-700",
      badgeText: "Prayer Requests",
    },
    {
      title: "Contact Submissions",
      description: "Review and manage all messages sent through the contact form.",
      to: "/contact-submissions",
      btnLabel: "Open Contact Submissions",
      color: "border-yellow-200",
      badge: "bg-yellow-100 text-yellow-700",
      badgeText: "Contact",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7fff5] py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#15436b]">Pastor Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome, Pastor {user?.firstName}. Here is your overview of the ministry.
          </p>
        </div>

        <DashboardSwitcher />

        <div className="grid sm:grid-cols-2 gap-5">
          {sections.map((section) => (
            <div
              key={section.to}
              className={`bg-white rounded-lg shadow-sm border-2 ${section.color} p-6 flex flex-col gap-3`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-[#15436b]">{section.title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${section.badge}`}>
                  {section.badgeText}
                </span>
              </div>
              <p className="text-gray-500 text-sm flex-1">{section.description}</p>
              <Link
                to={section.to}
                className="mt-auto inline-block px-4 py-2 bg-[#15436b] text-white text-sm rounded-lg hover:bg-[#0f2f4d] transition-colors text-center font-semibold"
              >
                {section.btnLabel}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
