const express = require('express');
const router = express.Router({ mergeParams: true });
const { v4: uuidv4 } = require('uuid');
const { body, query, validationResult } = require('express-validator');
const db = require('../models/db');
const { authenticate, requireProjectRole } = require('../middleware/auth');

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectRole(['admin', 'member']), (req, res) => {
  const { projectId } = req.params;
  const { status, assignee, priority, search } = req.query;

  let sql = `
    SELECT t.*,
      u1.name as assignee_name, u1.avatar_color as assignee_color,
      u2.name as creator_name,
      (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
      CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.project_id = ?
  `;
  const params = [projectId];

  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (assignee) { sql += ' AND t.assignee_id = ?'; params.push(assignee); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (search) { sql += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY CASE t.priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 ELSE 4 END, t.due_date ASC NULLS LAST, t.created_at DESC';

  const tasks = db.prepare(sql).all(...params);
  res.json({ tasks });
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectRole(['admin', 'member']), [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional({ nullable: true }).isString(),
  body('due_date').optional({ nullable: true }).isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status, priority, assignee_id, due_date } = req.body;
  const { projectId } = req.params;

  // Validate assignee is project member
  if (assignee_id) {
    const isMember = db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee is not a project member' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, created_by, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, description || null, status || 'todo', priority || 'medium', projectId, assignee_id || null, req.user.id, due_date || null);

  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.avatar_color as assignee_color, u2.name as creator_name,
      0 as comment_count, 0 as is_overdue
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.id = ?
  `).get(id);

  res.status(201).json({ task });
});

// PATCH /api/projects/:projectId/tasks/:taskId
router.patch('/:taskId', authenticate, requireProjectRole(['admin', 'member']), [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional({ nullable: true }),
  body('due_date').optional({ nullable: true }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { taskId, projectId } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(taskId, projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only edit tasks they created or are assigned to (admins can edit all)
  const memberRole = req.memberRole;
  if (memberRole === 'member' && task.created_by !== req.user.id && task.assignee_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit tasks you created or are assigned to' });
  }

  const allowed = ['title', 'description', 'status', 'priority', 'assignee_id', 'due_date'];
  const fields = [], vals = [];
  for (const key of allowed) {
    if (key in req.body) {
      fields.push(`${key} = ?`);
      vals.push(req.body[key] === '' ? null : req.body[key]);
    }
  }

  if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  vals.push(taskId);
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...vals);

  const updated = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u1.avatar_color as assignee_color, u2.name as creator_name,
      (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
      CASE WHEN t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE t.id = ?
  `).get(taskId);

  res.json({ task: updated });
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', authenticate, requireProjectRole(['admin', 'member']), (req, res) => {
  const { taskId, projectId } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(taskId, projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.memberRole === 'member' && task.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Only admins or task creators can delete tasks' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  res.json({ message: 'Task deleted' });
});

// GET /api/projects/:projectId/tasks/:taskId/comments
router.get('/:taskId/comments', authenticate, requireProjectRole(['admin', 'member']), (req, res) => {
  const { taskId } = req.params;
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar_color
    FROM task_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.task_id = ?
    ORDER BY c.created_at ASC
  `).all(taskId);
  res.json({ comments });
});

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post('/:taskId/comments', authenticate, requireProjectRole(['admin', 'member']), [
  body('content').trim().isLength({ min: 1, max: 1000 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { taskId } = req.params;
  const id = uuidv4();
  db.prepare('INSERT INTO task_comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)')
    .run(id, taskId, req.user.id, req.body.content);

  const comment = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar_color
    FROM task_comments c JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(id);
  res.status(201).json({ comment });
});

module.exports = router;
