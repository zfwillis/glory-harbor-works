import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DashboardSwitcher from "../components/DashboardSwitcher";

export default function PastorDash() {
  const { user } = useAuth();
  const firstName = user?.firstName || "Pastor";

  const sections = [
    {
      title: "Children's Ministry Hub",
      description: "View what is happening in children's ministry, including upcoming lessons and teaching updates.",
      to: "/teacher-dashboard",
      btnLabel: "Open Children's Ministry Hub",
      color: "border-gray-200",
      badge: "bg-[#dbeafe] text-[#1e3a8a]",
      badgeText: "Sermons",
      accent: "text-[#1e40af]",
      metric: "Ministry visibility",
    },
    {
      title: "Prayer Team Hub",
      description: "Review all prayer requests and update their status.",
      to: "/prayer-team-dashboard",
      btnLabel: "Open Prayer Hub",
      color: "border-gray-200",
      badge: "bg-[#dcfce7] text-[#166534]",
      badgeText: "Prayer Requests",
      accent: "text-[#166534]",
      metric: "Care follow-up",
    },
    {
      title: "Contact Submissions",
      description: "Review and manage all messages sent through the contact form.",
      to: "/contact-submissions",
      btnLabel: "Open Contact Submissions",
      color: "border-gray-200",
      badge: "bg-[#fef3c7] text-[#92400e]",
      badgeText: "Contact",
      accent: "text-[#92400e]",
      metric: "Message Inbox",
    },
  ];

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-7">
        <section className="relative overflow-hidden rounded-3xl border border-[#c7dbf2] bg-gradient-to-br from-[#0c2f4d] via-[#15436b] to-[#246798] px-6 py-8 sm:px-8 sm:py-10 shadow-xl">
          <div className="absolute -top-20 -left-16 h-52 w-52 rounded-full bg-[#38bdf8]/20 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-[#e7a027]/25 blur-3xl" aria-hidden="true" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.14)_42%,transparent_75%)]" aria-hidden="true" />

          <div className="relative z-10">
            <div>
              <p className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#dbeafe]">
                Ministry Overview
              </p>
              <h1 className="mt-4 text-3xl sm:text-4xl font-black leading-tight text-white">Pastor Dashboard</h1>
              <p className="mt-3 max-w-2xl text-[#e2e8f0] leading-relaxed">
                Welcome, Pastor {firstName}. Monitor children's ministry updates, prayer care activity, and contact messages in one workspace.
              </p>
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <DashboardSwitcher />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sections.map((section) => (
            <div
              key={section.to}
              className={`rounded-2xl border bg-white ${section.color} p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-[#15436b]">{section.title}</h2>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${section.badge}`}>
                  {section.badgeText}
                </span>
              </div>

              <p className={`text-xs font-semibold uppercase tracking-wide ${section.accent}`}>
                {section.metric}
              </p>

              <p className="text-gray-600 text-sm flex-1 leading-relaxed">{section.description}</p>

              <Link
                to={section.to}
                className="mt-auto inline-block px-4 py-2.5 bg-[#15436b] text-white text-sm rounded-xl hover:bg-[#0f2f4d] transition-colors text-center font-semibold"
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
