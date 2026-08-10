import { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare, Plus, X, Loader2, AlertCircle, Clock, Flag,
} from 'lucide-react';
import {
  fetchTasks, createTask, updateTask, deleteTask,
} from '@/lib/pms';
import type { Task } from '@/lib/types';

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  waiting: 'bg-gray-100 text-gray-600',
  completed: 'bg-green-100 text-green-700',
  escalated: 'bg-red-100 text-red-700',
};

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTasks(statusFilter ? { status: statusFilter } : undefined);
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'open' : 'completed';
    await updateTask(task.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            All ({tasks.length})
          </button>
          {['open', 'in_progress', 'waiting', 'completed', 'escalated'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <CheckSquare size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => {
            const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';
            return (
              <div
                key={t.id}
                onClick={() => { setEditing(t); setShowModal(true); }}
                className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all ${
                  isOverdue ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(t); }}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      t.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {t.status === 'completed' && <CheckSquare size={12} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${t.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {t.title}
                    </p>
                    {t.notes && <p className="text-xs text-gray-500 mt-1">{t.notes}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_STYLES[t.priority] ?? ''}`}>
                        <Flag size={9} className="inline -mt-0.5 mr-0.5" />{t.priority}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[t.status] ?? ''}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                      {t.due_date && (
                        <span className={`inline-flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                          <Clock size={11} /> {t.due_date}
                        </span>
                      )}
                      {t.auto_generated && <span className="text-xs text-gray-400 italic">auto-generated</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <TaskModal
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function TaskModal({ editing, onClose, onSaved }: { editing: Task | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: editing?.title ?? '',
    priority: editing?.priority ?? 'medium',
    status: editing?.status ?? 'open',
    due_date: editing?.due_date ?? '',
    notes: editing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('Task title is required'); return; }
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        ...form,
        due_date: form.due_date || null,
      };
      if (editing) {
        await updateTask(editing.id, payload);
      } else {
        await createTask(payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm('Delete this task?')) return;
    setSaving(true);
    try {
      await deleteTask(editing.id);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{editing ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {err && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"><AlertCircle size={16} /> {err}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting">Waiting</option>
                <option value="completed">Completed</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input" rows={3} />
          </div>
        </div>
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          {editing ? (
            <button onClick={handleDelete} disabled={saving} className="text-sm text-red-600 hover:underline disabled:opacity-50">Delete</button>
          ) : <span />}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {editing ? 'Save' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
