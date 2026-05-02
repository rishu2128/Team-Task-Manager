import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Spinner, StatusBadge, PriorityBadge, ColorDot, ProgressBar } from '../components/UI';
import { format, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, FolderKanban, ListTodo, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spinner size="lg" /></div>;
  if (!data) return null;

  const { taskStats, recentTasks, myProjects, projectCount } = data;

  const statCards = [
    { label: 'Projects', value: projectCount, icon: <FolderKanban size={20} />, color: 'var(--accent)' },
    { label: 'My Tasks', value: taskStats?.total || 0, icon: <ListTodo size={20} />, color: 'var(--purple)' },
    { label: 'In Progress', value: taskStats?.in_progress || 0, icon: <TrendingUp size={20} />, color: 'var(--yellow)' },
    { label: 'Overdue', value: taskStats?.overdue || 0, icon: <AlertCircle size={20} />, color: 'var(--red)' },
    { label: 'Done', value: taskStats?.done || 0, icon: <CheckCircle2 size={20} />, color: 'var(--green)' },
  ];

  return (
    <div className="page">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Here's what's happening with your work today.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
              <div style={{ color: s.color, opacity: 0.6 }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Recent tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>My Assigned Tasks</h2>
          </div>
          {recentTasks?.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <CheckCircle2 size={32} style={{ color: 'var(--green)', marginBottom: 10 }} />
              <p style={{ color: 'var(--text2)' }}>All caught up! No pending tasks.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Priority</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks?.map(task => (
                    <tr key={task.id}>
                      <td>
                        <Link to={`/projects/${task.project_id}`} style={{ color: task.is_overdue ? 'var(--red)' : 'var(--text)', textDecoration: 'none', fontWeight: 450 }}>
                          {task.title}
                        </Link>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ColorDot color={task.project_color} />
                          <span style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>{task.project_name}</span>
                        </div>
                      </td>
                      <td><PriorityBadge priority={task.priority} /></td>
                      <td>
                        {task.due_date ? (
                          <span className={task.is_overdue ? 'overdue' : ''} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {task.is_overdue && <AlertCircle size={12} />}
                            {format(parseISO(task.due_date), 'MMM d')}
                          </span>
                        ) : <span style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>–</span>}
                      </td>
                      <td><StatusBadge status={task.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Projects panel */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>My Projects</h2>
            <Link to="/projects" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myProjects?.length === 0 && (
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>No projects yet. <Link to="/projects">Create one</Link></p>
              </div>
            )}
            {myProjects?.map(p => (
              <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: 16, transition: 'border-color 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = p.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = ''}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <ColorDot color={p.color} size={8} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text3)' }}>{p.my_role}</span>
                  </div>
                  <ProgressBar value={p.done_count} max={p.task_count} color={p.color} />
                  <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: '0.75rem', color: 'var(--text3)' }}>
                    <span>{p.task_count} tasks</span>
                    <span>{p.member_count} members</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
