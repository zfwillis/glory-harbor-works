import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DashboardSwitcher from "../components/DashboardSwitcher";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ROLES = ["member", "admin", "pastor", "teacher", "prayer_team"];
const ROLE_STATS = ["total", ...ROLES];

const roleLabel = (role) => {
  const labels = {
    total: "Total",
    member: "Member",
    admin: "Admin",
    pastor: "Pastor",
    teacher: "Teacher",
    prayer_team: "Prayer Team",
  };
  return labels[role] || role;
};

const roleBadgeColor = (role) => {
  const colors = {
    member: "bg-gray-100 text-gray-700",
    admin: "bg-red-100 text-red-700",
    pastor: "bg-purple-100 text-purple-700",
    teacher: "bg-blue-100 text-blue-700",
    prayer_team: "bg-green-100 text-green-700",
  };
  return colors[role] || "bg-gray-100 text-gray-700";
};

export default function AdminDash() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inactiveLoading, setInactiveLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: "", message: "" });
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // pendingRoles: { [userId]: selectedRole }
  const [pendingRoles, setPendingRoles] = useState({});

  // deleteConfirm: userId to deactivate, or null
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/users?status=active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchInactiveUsers = async () => {
    try {
      setInactiveLoading(true);
      const res = await fetch(`${API_URL}/users?status=inactive`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load deactivated accounts");
      setInactiveUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setInactiveLoading(false);
    }
  };

  const handleInactiveToggle = async () => {
    setShowInactive((current) => {
      const next = !current;
      if (next) {
        fetchInactiveUsers();
      }
      return next;
    });
    setMessage("");
    setError("");
    setDeleteConfirm(null);
  };

  const handleAnnouncementChange = (event) => {
    const { name, value } = event.target;
    setAnnouncement((prev) => ({ ...prev, [name]: value }));
    setMessage("");
    setError("");
  };

  const handleSendAnnouncement = async (event) => {
    event.preventDefault();
    const announcementMessage = announcement.message.trim();

    if (!announcementMessage) {
      setError("Announcement message is required.");
      setMessage("");
      return;
    }

    setSendingAnnouncement(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_URL}/notifications/announcements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: announcement.title,
          message: announcementMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send announcement");
      setAnnouncement({ title: "", message: "" });
      setMessage(data.message || "Announcement sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleRoleSelect = (userId, newRole) => {
    setPendingRoles((prev) => ({ ...prev, [userId]: newRole }));
  };

  const handleRoleConfirm = async (userId) => {
    const newRole = pendingRoles[userId];
    if (!newRole) return;
    setMessage("");
    setError("");
    setUpdatingId(userId);
    try {
      const res = await fetch(`${API_URL}/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update role");
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, ...(data.user || {}), role: data.user?.role || u.role } : u))
      );
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setMessage(data.message || `Role updated to "${roleLabel(newRole)}" for ${data.user?.firstName || "user"}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleCancel = (userId) => {
    setPendingRoles((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const handleDeactivateConfirm = async () => {
    const userId = deleteConfirm;
    if (!userId) return;
    setDeleteConfirm(null);
    setMessage("");
    setError("");
    setDeletingId(userId);
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to deactivate user");
      const deactivated = users.find((u) => u._id === userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      if (showInactive) {
        setInactiveUsers((prev) => [{ ...deactivated, status: "inactive" }, ...prev].filter((u) => u?._id));
      }
      setMessage(`Account for ${deactivated?.firstName || "user"} ${deactivated?.lastName || ""} deactivated.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const matchesSearch = (u) => {
    const q = search.toLowerCase();
    const userStatus = String(u.status || "active").toLowerCase();

    if (userStatus !== "active") {
      return false;
    }

    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  };

  const filtered = users.filter(matchesSearch);
  const inactiveFiltered = inactiveUsers.filter((u) => {
    const q = search.toLowerCase();
    const userStatus = String(u.status || "active").toLowerCase();

    if (userStatus !== "inactive") {
      return false;
    }

    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const deleteTarget = users.find((u) => u._id === deleteConfirm);

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#15436b]">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Manage user roles and deactivate accounts across the Glory Harbor community.
          </p>
        </div>

        <DashboardSwitcher />

        <section className="mb-8 rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#15436b]">Send Announcement</h2>
          <p className="mt-1 text-sm text-gray-500">Send a notification to all active member accounts.</p>
          <form onSubmit={handleSendAnnouncement} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                name="title"
                value={announcement.title}
                onChange={handleAnnouncementChange}
                placeholder="Announcement"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#15436b]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
              <textarea
                name="message"
                value={announcement.message}
                onChange={handleAnnouncementChange}
                rows={4}
                placeholder="Write the announcement members should see..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-[#15436b]"
              />
            </div>
            <button
              type="submit"
              disabled={sendingAnnouncement}
              className="rounded-lg bg-[#15436b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f2f4d] disabled:opacity-50"
            >
              {sendingAnnouncement ? "Sending..." : "Send Announcement"}
            </button>
          </form>
        </section>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {ROLE_STATS.map((role) => {
            const count = role === "total" ? users.length : users.filter((u) => u.role === role).length;
            return (
              <div
                key={role}
                className="bg-white rounded-lg shadow-sm p-4 text-center border border-gray-100"
              >
                <p className="text-2xl font-bold text-[#15436b]">{count}</p>
                <p className="text-xs text-gray-500 mt-1">{roleLabel(role)}</p>
              </div>
            );
          })}
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15436b] focus:border-transparent"
          />
        </div>

        {/* User Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-lg font-semibold text-[#15436b]">Active Accounts</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No active accounts found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#15436b] text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Change Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => {
                  const isSelf = u._id === (currentUser?._id || currentUser?.id);
                  const pending = pendingRoles[u._id];
                  const hasPending = pending !== undefined && pending !== u.role;
                  const isUpdating = updatingId === u._id;
                  const isDeleting = deletingId === u._id;

                  return (
                    <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {u.firstName} {u.lastName}
                        {isSelf && (
                          <span className="ml-2 text-xs text-[#E7A027] font-semibold">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleBadgeColor(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-xs text-gray-400 italic">Cannot change own role</span>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={pending !== undefined ? pending : u.role}
                              onChange={(e) => handleRoleSelect(u._id, e.target.value)}
                              disabled={isUpdating}
                              className={`px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-[#15436b] focus:border-transparent disabled:opacity-50 ${
                                hasPending ? "border-[#E7A027]" : "border-gray-300"
                              }`}
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{roleLabel(r)}</option>
                              ))}
                            </select>
                            {hasPending && (
                              <>
                                <button
                                  onClick={() => handleRoleConfirm(u._id)}
                                  disabled={isUpdating}
                                  className="px-2 py-1 text-xs bg-[#15436b] text-white rounded hover:bg-[#0f2f4d] transition-colors disabled:opacity-50"
                                >
                                  {isUpdating ? "Saving…" : "Confirm"}
                                </button>
                                <button
                                  onClick={() => handleRoleCancel(u._id)}
                                  disabled={isUpdating}
                                  className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          u.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <span className="text-xs text-gray-400 italic">—</span>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(u._id)}
                            disabled={isDeleting}
                            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? "Deactivating..." : "Deactivate Account"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex justify-start">
          <button
            type="button"
            onClick={handleInactiveToggle}
            className="rounded-lg border border-[#15436b] px-4 py-2 text-sm font-semibold text-[#15436b] hover:bg-[#eaf3fb]"
          >
            {showInactive ? "Hide Deactivated Accounts" : "View Deactivated Accounts"}
          </button>
        </div>

        {showInactive && (
          <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-lg font-semibold text-[#15436b]">Deactivated Accounts</h2>
            </div>
            {inactiveLoading ? (
              <div className="p-8 text-center text-gray-500">Loading deactivated accounts...</div>
            ) : inactiveFiltered.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No deactivated accounts found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#15436b] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inactiveFiltered.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleBadgeColor(u.role)}`}>
                          {roleLabel(u.role)}
                        </span>
                        {u.pendingRole && (
                          <span className="ml-2 inline-block rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700">
                            Pending {roleLabel(u.pendingRole)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 italic">Deactivated</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      {/* Deactivate Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Deactivate Account</h3>
            <p className="text-gray-600 mb-1">
              Are you sure you want to deactivate the account for:
            </p>
            <p className="font-semibold text-gray-800 mb-4">
              {deleteTarget?.firstName} {deleteTarget?.lastName}
              <span className="block text-sm font-normal text-gray-500">{deleteTarget?.email}</span>
            </p>
            <p className="text-sm text-red-600 mb-5">This account will no longer be able to log in.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateConfirm}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


