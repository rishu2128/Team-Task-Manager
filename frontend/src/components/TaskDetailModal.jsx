import { useState, useEffect } from 'react';
import api from '../api';
import { Avatar, StatusBadge, PriorityBadge, Spinner } from './UI';
import { useToast } from '../context/ToastContext';
import { format, parseISO } from 'date-fns';
import { MessageSquare, Edit2, Trash2, AlertCircle } from 'lucide-react';

export default function TaskDetailModal({ task, projectId, members, canEdit, canDelete, onClose, onEdit, onDelete }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get(`/projects/${projectId}/tasks/${task.id}/comments`)
      .then(r => setComments(r.data.comments))
      .finally(() => setLoadingComments(false));
  }, [task.id]);

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const r = await api.post(`/projects/${projectId}/tasks/${task.id}/comments`, { content: newComment });
      setComments(prev => [...prev, r.data.comment]);
      setNewComment('');
    } catch { toast('Failed to add comment', 'error'); }
    finally { setSubmitting(false); }
  };

  const assignee = members?.find(m => m.id === task.assignee_id);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div>
              <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{task.title}</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {task.is_overdue ? <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--red)' }}><AlertCircle size={11} /> Overdue</span> : null}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
            {canEdit && <button className="btn btn-ghost btn-sm btn-icon" onClick={onEdit} title="Edit"><Edit2 size={15} /></button>}
            {canDelete && <button className="btn btn-danger btn-sm btn-icon" onClick={onDelete} title="Delete"><Trash2 size={15} /></button>}
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Assignee</div>
              {assignee ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={assignee.name} color={assignee.avatar_color} />
                  <span style={{ fontSize: '0.875rem' }}>{assignee.name}</span>
                </div>
              ) : <span style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>Unassigned</span>}
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Due Date</div>
              <span style={{ fontSize: '0.875rem', color: task.is_overdue ? 'var(--red)' : 'var(--text)' }}>
                {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : '–'}
              </span>
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Created by</div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>{task.creator_name}</span>
            </div>
            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Created</div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text2)' }}>{format(parseISO(task.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>Description</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.description}</p>
            </div>
          )}

          {/* Comments */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <MessageSquare size={15} style={{ color: 'var(--text3)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Comments ({comments.length})</span>
            </div>

            {loadingComments ? <Spinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 240, overflowY: 'auto', marginBottom: 14 }}>
                {comments.length === 0 && <p style={{ color: 'var(--text3)', fontSize: '0.83rem' }}>No comments yet.</p>}
                {comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <Avatar name={c.user_name} color={c.avatar_color} />
                    <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{c.user_name}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{format(parseISO(c.created_at), 'MMM d, HH:mm')}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.5 }}>{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input" placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={submitComment} disabled={submitting || !newComment.trim()}>
                {submitting ? <Spinner /> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
