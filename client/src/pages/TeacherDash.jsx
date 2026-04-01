import { useAuth } from "../context/AuthContext";
import DashboardSwitcher from "../components/DashboardSwitcher";

export default function TeacherDash() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f7fff5] py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#15436b]">Teacher Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome, {user?.firstName}. This area is reserved for kids content.
          </p>
        </div>

        <DashboardSwitcher />

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <h2 className="text-xl font-semibold text-[#15436b]">Kids Content Hub</h2>
          <p className="text-gray-500 mt-3">This dashboard is intentionally blank for now.</p>
        </div>
      </div>
    </div>
  );
}
