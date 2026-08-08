import { useState, useEffect, useCallback } from 'react';
import { listUsers, createUser, updateUser, deleteUser } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { Users, UserPlus, Trash2, Edit3, Shield, Loader2, AlertCircle, CheckCircle2, X, Lock, Mail } from 'lucide-react';
import type { ManagedUser, UserRole } from '@/lib/types';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listUsers();
      setUsers(list);
    } catch {
      setError('Failed to load users. Make sure you are signed in as admin.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 size={32} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Team Members</h2>
            <p className="text-xs text-gray-500">{users.length} {users.length === 1 ? 'user' : 'users'} with access</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto"
        >
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}

      {/* User list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">User</th>
                <th className="px-5 py-3.5 text-left">Role</th>
                <th className="px-5 py-3.5 text-left hidden sm:table-cell">Added</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{u.email}</p>
                          {isSelf && <p className="text-[10px] text-blue-500 font-medium">You</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role === 'admin' && <Shield size={11} />}
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <UserModal
          title="Add New User"
          onClose={() => setShowAdd(false)}
          onSubmit={async (email, password, role) => {
            const result = await createUser(email, password, role);
            if (result.success) {
              setShowAdd(false);
              showSuccess(`User ${email} created successfully.`);
              loadUsers();
            } else {
              setError(result.error || 'Failed to create user');
            }
            return result;
          }}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <UserModal
          title="Edit User"
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={async (_email, password, role) => {
            const result = await updateUser(editingUser.id, editingUser.email, role, password || undefined);
            if (result.success) {
              setEditingUser(null);
              showSuccess(`User ${editingUser.email} updated successfully.`);
              loadUsers();
            } else {
              setError(result.error || 'Failed to update user');
            }
            return result;
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <DeleteConfirm
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const result = await deleteUser(deleteTarget.id, deleteTarget.email);
            if (result.success) {
              setDeleteTarget(null);
              showSuccess(`User ${deleteTarget.email} has been removed.`);
              loadUsers();
            } else {
              setError(result.error || 'Failed to delete user');
              setDeleteTarget(null);
            }
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// User Modal (add/edit)
// ============================================================
function UserModal({
  title,
  user,
  onClose,
  onSubmit,
}: {
  title: string;
  user?: ManagedUser;
  onClose: () => void;
  onSubmit: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
}) {
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user?.role || 'user');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!user && (!email || !password)) {
      setError('Email and password are required.');
      setSaving(false);
      return;
    }
    if (user && password && password.length < 6) {
      setError('Password must be at least 6 characters.');
      setSaving(false);
      return;
    }
    if (!user && password.length < 6) {
      setError('Password must be at least 6 characters.');
      setSaving(false);
      return;
    }

    const result = await onSubmit(email, password, role);
    if (!result.success) {
      setError(result.error || 'Something went wrong');
    }
    setSaving(false);
  };

  const inputCls = 'w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required={!user}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!user}
                placeholder="user@company.com"
                className={inputCls + (user ? ' bg-gray-50 text-gray-400' : '')}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {user ? 'New Password (leave blank to keep)' : 'Password'}
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required={!user}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={user ? '••••••••' : 'Min 6 characters'}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  role === 'user' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  role === 'admin' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Shield size={14} /> Admin
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {role === 'admin' ? 'Admins can access Settings and manage users.' : 'Users can create documents and view history.'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-lg">
              <AlertCircle size={15} className="shrink-0" /> <span className="text-xs">{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Delete Confirmation
// ============================================================
function DeleteConfirm({
  user,
  onClose,
  onConfirm,
}: {
  user: ManagedUser;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">Remove User?</h3>
        <p className="text-xs text-gray-500 mb-1">
          Are you sure you want to remove <strong className="text-gray-700">{user.email}</strong>?
        </p>
        <p className="text-xs text-gray-400 mb-5">This action cannot be undone.</p>

        <div className="flex items-center justify-center gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
          >
            <Trash2 size={15} /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}
