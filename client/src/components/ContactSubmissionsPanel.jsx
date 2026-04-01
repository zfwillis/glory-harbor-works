import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const STATUS_OPTIONS = ["new", "read", "responded"];

const STATUS_META = {
  new: {
    label: "New",
    sectionBorder: "border-yellow-200",
    sectionBg: "bg-yellow-50",
  },
  read: {
    label: "Read",
    sectionBorder: "border-blue-200",
    sectionBg: "bg-blue-50",
  },
  responded: {
    label: "Responded",
    sectionBorder: "border-green-200",
    sectionBg: "bg-green-50",
  },
};

const statusStyles = {
  new: "bg-yellow-100 text-yellow-800",
  read: "bg-blue-100 text-blue-800",
  responded: "bg-green-100 text-green-800",
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function ContactSubmissionsPanel({
  token,
  limit = 6,
  compact = false,
  hideHeader = false,
  hideContainer = false,
  showStatusControls = true,
  groupedByStatus = false,
  folderTabs = false,
}) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [activeFolder, setActiveFolder] = useState("new");

  const fetchContacts = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/contact?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load contact submissions");
      }

      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
    } catch (fetchError) {
      setError(fetchError.message || "Could not load contact submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [token, limit]);

  const updateStatus = async (contactId, status) => {
    setError("");
    setMessage("");
    setUpdatingId(contactId);

    try {
      const response = await fetch(`${API_URL}/contact/${contactId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update contact status");
      }

      setContacts((prev) =>
        prev.map((contact) =>
          contact._id === contactId ? { ...contact, status: data.contact?.status || status } : contact
        )
      );
      setMessage("Contact status updated.");
    } catch (updateError) {
      setError(updateError.message || "Could not update contact status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const renderContactCard = (contact) => (
    <div key={contact._id} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div>
          <p className="font-semibold text-gray-800">{contact.subject}</p>
          <p className="text-sm text-gray-600">
            {contact.name} ({contact.email})
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            statusStyles[contact.status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {contact.status}
        </span>
      </div>

      <p className={`text-sm text-gray-700 whitespace-pre-wrap ${compact ? "line-clamp-1" : ""}`}>
        {contact.message}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500">Submitted {formatDate(contact.createdAt)}</p>
        {showStatusControls && (
          <div className="flex items-center gap-2">
            <label htmlFor={`status-${contact._id}`} className="text-xs text-gray-600">
              Status
            </label>
            <select
              id={`status-${contact._id}`}
              value={contact.status}
              disabled={updatingId === contact._id}
              onChange={(e) => updateStatus(contact._id, e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#15436b] focus:border-transparent disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );

  const folderCounts = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = contacts.filter((contact) => contact.status === status).length;
    return acc;
  }, {});

  const activeFolderContacts = contacts.filter((contact) => contact.status === activeFolder);

  return (
    <div className={hideContainer ? "" : "bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6"}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        {!hideHeader ? (
          <div>
            <h2 className="text-xl font-semibold text-[#15436b]">Contact Submissions</h2>
            <p className="text-gray-500 text-sm mt-1">Recent messages sent through the public contact form.</p>
          </div>
        ) : (
          <div />
        )}
        {showStatusControls && (
          <button
            type="button"
            onClick={fetchContacts}
            className="px-3 py-2 text-sm rounded-lg border border-[#15436b] text-[#15436b] hover:bg-[#eaf3fb] transition-colors"
          >
            Refresh
          </button>
        )}
      </div>

      {message && (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading contact submissions...</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-gray-500">No contact submissions yet.</p>
      ) : folderTabs ? (
        <div>
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {STATUS_OPTIONS.map((status) => {
              const isActive = activeFolder === status;
              const meta = STATUS_META[status];
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveFolder(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    isActive
                      ? `${meta.sectionBorder} ${meta.sectionBg} text-[#15436b]`
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {meta.label} ({folderCounts[status] || 0})
                </button>
              );
            })}
          </div>

          {activeFolderContacts.length === 0 ? (
            <p className="text-sm text-gray-500">No messages in this folder.</p>
          ) : (
            <div className="space-y-3">{activeFolderContacts.map(renderContactCard)}</div>
          )}
        </div>
      ) : groupedByStatus ? (
        <div className="grid md:grid-cols-3 gap-4">
          {STATUS_OPTIONS.map((status) => {
            const folderContacts = contacts.filter((contact) => contact.status === status);
            const meta = STATUS_META[status];

            return (
              <section
                key={status}
                className={`rounded-lg border ${meta.sectionBorder} ${meta.sectionBg} p-3`}
                aria-label={`${meta.label} contact submissions`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#15436b]">{meta.label}</h3>
                  <span className="text-xs font-semibold text-gray-600">{folderContacts.length}</span>
                </div>

                {folderContacts.length === 0 ? (
                  <p className="text-xs text-gray-500">No messages in this folder.</p>
                ) : (
                  <div className="space-y-2">{folderContacts.map(renderContactCard)}</div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map(renderContactCard)}
        </div>
      )}
    </div>
  );
}
