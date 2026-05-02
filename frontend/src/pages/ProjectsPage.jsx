import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Spinner, Modal, ProgressBar, ColorDot, EmptyState } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Plus, FolderKanban, Users, CheckSquare } from 'lucide-react';

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316'];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  const load = () => api.get('/projects').then(r => setProjects(r.data.projects)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  if (loading) return <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spinner size="lg" /></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Projects</h1>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No projects yet"
          description="Create your first project to start organizing tasks and collaborating with your team."
          action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} />Create Project</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ transition: 'all 0.15s', cursor: 'pointer', height: '100%' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: p.color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FolderKanban size={20} style={{ color: p.color }} />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.name}</h3>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>{p.my_role}</span>
                    </div>
                  </div>
                </div>
                {p.description && <p style={{ fontSize: '0.83rem', color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>{p.description}</p>}
                <ProgressBar value={p.done_count} max={p.task_count} color={p.color} />
                <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: '0.8rem', color: 'var(--text3)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckSquare size={13} /> {p.task_count} tasks</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13} /> {p.member_count} members</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={p => { setProjects(prev => [p, ...prev]); setShowCreate(false); toast('Project created!'); }} />}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!form.name.trim()) { toast('Project name is required', 'error'); return; }
    setLoading(true);
    try {
      const r = await api.post('/projects', form);
      onCreated(r.data.project);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to create', 'error');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="New Project" onClose={onClose} footer={<>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? <Spinner /> : 'Create'}</button>
    </>}>
      <div className="form-group">
        <label className="form-label">Project Name *</label>
        <input className="input" placeholder="My Awesome Project" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="input" placeholder="What is this project about?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
      </div>
      <div className="form-group">
        <label className="form-label">Color</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setForm({ ...form, color: c })} style={{
              width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
              outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2,
              transform: form.color === c ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.15s'
            }} />
          ))}
        </div>
      </div>
    </Modal>
  );
}
