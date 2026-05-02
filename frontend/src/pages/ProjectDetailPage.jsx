import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, StatusBadge, PriorityBadge, Spinner, Modal, ProgressBar, ColorDot, EmptyState } from '../components/UI';
import TaskModal from '../components/TaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import { format, parseISO } from 'date-fns';
import { Plus, Users, Settings, Trash2, ChevronLeft, AlertCircle, Filter, List, Kanban } from 'lucide-react';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--text3)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--accent)' },
  { key: 'review', label: 'Review', color: 'var(--purple)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban'); // kanban | list
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [viewTask, setViewTask] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [filter, setFilter] = useState({ priority: '', assignee: '' });

  const load = async () => {
    try {
      const [projR, tasksR] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
      ]);
      setProject(projR.data.project);
      setMembers(projR.data.members);
      setTasks(tasksR.data.tasks);
    } catch (err) {
      toast('Failed to load project', 'error');
      navigate('/projects');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const reloadTasks = () => api.get(`/projects/${projectId}/tasks`, { params: filter }).then(r => setTasks(r.data.tasks));

  const isAdmin = project?.my_role === 'admin';

  const handleTaskSaved = (task) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = task; return n; }
      return [task, ...prev];
    });
    setShowTaskModal(false);
    setEditTask(null);
    setViewTask(null);
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setViewTask(null);
      toast('Task deleted');
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const r = await api.patch(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? r.data.task : t));
    } catch { toast('Failed to update status', 'error'); }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.assignee && t.assignee_id !== filter.assignee) return false;
    return true;
  });

  if (loading) return <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spinner size="lg" /></div>;

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filteredTasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/projects" style={{ color: 'var(--text3)', textDecoration: 'none', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          <ChevronLeft size={14} /> Projects
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: (project?.color || '#6366f1') + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: project?.color || '#6366f1' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', marginBottom: 2 }}>{project?.name}</h1>
              {project?.description && <p style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>{project.description}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: 3, border: '1px solid var(--border)' }}>
              <button className={`btn btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-ghost'}`} style={{ border: 'none' }} onClick={() => setView('kanban')}><Kanban size={14} /> Board</button>
              <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`} style={{ border: 'none' }} onClick={() => setView('list')}><List size={14} /> List</button>
            </div>
            <button className="btn btn-ghost" onClick={() => setShowMembers(true)}><Users size={15} /> Team ({members.length})</button>
            <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}><Plus size={15} /> Add Task</button>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <ProgressBar value={doneCount} max={tasks.length} color={project?.color} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--text3)' }} />
        <select className="input" style={{ width: 'auto', fontSize: '0.82rem', padding: '5px 8px' }} value={filter.priority} onChange={e => setFilter({ ...filter, priority: e.target.value })}>
          <option value="">All priorities</option>
          {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', fontSize: '0.82rem', padding: '5px 8px' }} value={filter.assignee} onChange={e => setFilter({ ...filter, assignee: e.target.value })}>
          <option value="">All members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {(filter.priority || filter.assignee) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ priority: '', assignee: '' })}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text3)' }}>{filteredTasks.length} tasks</span>
      </div>

      {/* Kanban Board */}
      {view === 'kanban' && (
        <div className="kanban-board">
          {COLUMNS.map(col => (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <h4 style={{ color: col.color }}>{col.label}</h4>
                </div>
                <span style={{ background: 'var(--bg)', borderRadius: 100, padding: '2px 8px', fontSize: '0.75rem', color: 'var(--text3)' }}>
                  {tasksByStatus[col.key]?.length || 0}
                </span>
              </div>
              <div className="kanban-tasks">
                {tasksByStatus[col.key]?.map(task => (
                  <div key={task.id} className="kanban-card" onClick={() => setViewTask(task)}>
                    {task.is_overdue && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--red)', marginBottom: 6 }}>
                        <AlertCircle size={11} /> Overdue
                      </div>
                    )}
                    <p style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>{task.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <PriorityBadge priority={task.priority} />
                      {task.assignee_id ? (
                        <Avatar name={task.assignee_name} color={task.assignee_color} />
                      ) : null}
                    </div>
                    {task.due_date && (
                      <div style={{ fontSize: '0.72rem', color: task.is_overdue ? 'var(--red)' : 'var(--text3)', marginTop: 6 }}>
                        Due {format(parseISO(task.due_date), 'MMM d')}
                      </div>
                    )}
                    {/* Quick status change */}
                    <select
                      className="input"
                      style={{ marginTop: 8, fontSize: '0.72rem', padding: '3px 6px' }}
                      value={task.status}
                      onClick={e => e.stopPropagation()}
                      onChange={e => handleStatusChange(task.id, e.target.value)}
                    >
                      {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                ))}
                {tasksByStatus[col.key]?.length === 0 && (
                  <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text3)', fontSize: '0.8rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filteredTasks.length === 0 ? (
            <EmptyState icon="✅" title="No tasks" description="Add your first task to get started." action={<button className="btn btn-primary" onClick={() => setShowTaskModal(true)}><Plus size={14} />Add Task</button>} />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => setViewTask(task)}>
                    <td>
                      <div style={{ fontWeight: 450, color: task.is_overdue ? 'var(--red)' : 'var(--text)' }}>
                        {task.is_overdue && <AlertCircle size={12} style={{ marginRight: 4, display: 'inline' }} />}
                        {task.title}
                      </div>
                      {task.comment_count > 0 && <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 2 }}>💬 {task.comment_count}</div>}
                    </td>
                    <td><StatusBadge status={task.status} /></td>
                    <td><PriorityBadge priority={task.priority} /></td>
                    <td>
                      {task.assignee_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Avatar name={task.assignee_name} color={task.assignee_color} />
                          <span style={{ fontSize: '0.82rem' }}>{task.assignee_name}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>–</span>}
                    </td>
                    <td>
                      {task.due_date ? (
                        <span style={{ fontSize: '0.82rem', color: task.is_overdue ? 'var(--red)' : 'var(--text2)' }}>
                          {format(parseISO(task.due_date), 'MMM d, yyyy')}
                        </span>
                      ) : <span style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>–</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        {(isAdmin || task.created_by === user?.id || task.assignee_id === user?.id) && (
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditTask(task); setShowTaskModal(true); }}><Filter size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      {showTaskModal && (
        <TaskModal
          task={editTask}
          projectId={projectId}
          members={members}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
          onSaved={handleTaskSaved}
        />
      )}

      {viewTask && (
        <TaskDetailModal
          task={viewTask}
          projectId={projectId}
          members={members}
          canEdit={isAdmin || viewTask.created_by === user?.id || viewTask.assignee_id === user?.id}
          canDelete={isAdmin || viewTask.created_by === user?.id}
          onClose={() => setViewTask(null)}
          onEdit={() => { setEditTask(viewTask); setShowTaskModal(true); setViewTask(null); }}
          onDelete={() => handleDeleteTask(viewTask.id)}
        />
      )}

      {showMembers && (
        <MembersModal
          project={project}
          members={members}
          isAdmin={isAdmin}
          userId={user?.id}
          onClose={() => setShowMembers(false)}
          onUpdate={() => { load(); }}
        />
      )}
    </div>
  );
}

function MembersModal({ project, members, isAdmin, userId, onClose, onUpdate }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const invite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post(`/projects/${project.id}/members`, { email, role });
      toast(`${email} added as ${role}`);
      setEmail('');
      onUpdate();
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error'); }
    finally { setLoading(false); }
  };

  const changeRole = async (memberId, newRole) => {
    try {
      await api.patch(`/projects/${project.id}/members/${memberId}`, { role: newRole });
      toast('Role updated');
      onUpdate();
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const removeMember = async (memberId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${project.id}/members/${memberId}`);
      toast('Member removed');
      onUpdate();
      if (memberId === userId) { onClose(); navigate('/projects'); }
    } catch (err) { toast(err.response?.data?.error || 'Failed', 'error'); }
  };

  return (
    <Modal title={`Team · ${project.name}`} onClose={onClose}>
      {isAdmin && (
        <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 4 }}>
          <div className="form-label" style={{ marginBottom: 8 }}>Invite by email</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="colleague@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && invite()} style={{ flex: 1 }} />
            <select className="input" style={{ width: 110 }} value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn btn-primary" onClick={invite} disabled={loading}>{loading ? <Spinner /> : 'Add'}</button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 6 }}>User must have a TaskFlow account.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius)' }}>
            <Avatar name={m.name} color={m.avatar_color} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.name} {m.id === userId ? '(you)' : ''}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{m.email}</div>
            </div>
            {isAdmin && m.id !== project.owner_id ? (
              <select className="input" style={{ width: 100, fontSize: '0.8rem', padding: '4px 8px' }} value={m.role} onChange={e => changeRole(m.id, e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)', padding: '4px 8px', background: 'var(--bg2)', borderRadius: 4 }}>
                {m.id === project.owner_id ? 'Owner' : m.role}
              </span>
            )}
            {isAdmin && m.id !== project.owner_id && (
              <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeMember(m.id)}><Trash2 size={13} /></button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
