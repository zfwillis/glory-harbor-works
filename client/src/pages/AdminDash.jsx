import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DashboardSwitcher from "../components/DashboardSwitcher";
import ContactSubmissionsPanel from "../components/ContactSubmissionsPanel";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ROLES = ["member", "admin", "pastor", "teacher", "prayer_team"];

const roleLabel = (role) => {
  const labels = {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");

  // pendingRoles: { [userId]: selectedRole }
  const [pendingRoles, setPendingRoles] = useState({});

  // deleteConfirm: userId to confirm, or null
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/users`, {
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
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      setPendingRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setMessage(`Role updated to "${roleLabel(newRole)}" for ${data.user?.firstName || "user"}.`);
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

  const handleDeleteConfirm = async () => {
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
      if (!res.ok) throw new Error(data.message || "Failed to delete user");
      const deleted = users.find((u) => u._id === userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setMessage(`Account for ${deleted?.firstName || "user"} ${deleted?.lastName || ""} deleted.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const deleteTarget = users.find((u) => u._id === deleteConfirm);

  return (
    <div className="min-h-screen bg-[#f7fff5] py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#15436b]">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Manage user roles and accounts across the Glory Harbor community.
          </p>
        </div>

        <DashboardSwitcher />

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {ROLES.map((role) => {
            const count = users.filter((u) => u.role === role).length;
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
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15436b] focus:border-transparent"
          />
        </div>

        {/* User Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No users found.</div>
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
                  const isSelf = u._id === currentUser?._id;
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
                            {isDeleting ? "Deleting…" : "Delete"}
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

        <ContactSubmissionsPanel token={token} limit={6} compact />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Account</h3>
            <p className="text-gray-600 mb-1">
              Are you sure you want to delete the account for:
            </p>
            <p className="font-semibold text-gray-800 mb-4">
              {deleteTarget?.firstName} {deleteTarget?.lastName}
              <span className="block text-sm font-normal text-gray-500">{deleteTarget?.email}</span>
            </p>
            <p className="text-sm text-red-600 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
