import { useAuth } from "../context/AuthContext";
import DashboardSwitcher from "../components/DashboardSwitcher";
import ContactSubmissionsPanel from "../components/ContactSubmissionsPanel";

export default function ContactSubmissions() {
  const { token } = useAuth();

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#15436b]">Contact Submissions</h1>
          <p className="text-gray-500 mt-1">
            Full view of all contact form messages with status management.
          </p>
        </div>

        <DashboardSwitcher />

        <ContactSubmissionsPanel token={token} limit={200} folderTabs />
      </div>
    </div>
  );
}
