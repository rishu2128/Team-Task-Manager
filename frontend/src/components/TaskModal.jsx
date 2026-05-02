import { useState } from 'react';
import { Modal, Spinner } from './UI';
import api from '../api';
import { useToast } from '../context/ToastContext';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

export default function TaskModal({ task, projectId, members, onClose, onSaved }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '',
    due_date: task?.due_date || '',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!form.title.trim()) { toast('Title is required', 'error'); return; }
    setLoading(true);
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null };
      let r;
      if (isEdit) {
        r = await api.patch(`/projects/${projectId}/tasks/${task.id}`, payload);
      } else {
        r = await api.post(`/projects/${projectId}/tasks`, payload);
      }
      onSaved(r.data.task);
      toast(`Task ${isEdit ? 'updated' : 'created'}!`);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed';
      toast(msg, 'error');
    } finally { setLoading(false); }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Task' : 'Create Task'}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? <Spinner /> : isEdit ? 'Save' : 'Create'}</button>
      </>}
    >
      <div className="form-group">
        <label className="form-label">Title *</label>
        <input className="input" placeholder="What needs to be done?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="input" placeholder="Add more detail..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Assignee</label>
          <select className="input" value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
            <option value="">Unassigned</option>
            {members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Due Date</label>
          <input className="input" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
