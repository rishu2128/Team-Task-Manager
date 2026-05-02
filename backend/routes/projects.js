const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../models/db');
const { authenticate, requireProjectRole } = require('../middleware/auth');

// GET /api/projects - list user's projects
router.get('/', authenticate, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
      pm.role as my_role
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.owner_id
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json({ projects });
});

// POST /api/projects - create project
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, color } = req.body;
  const id = uuidv4();

  const insert = db.transaction(() => {
    db.prepare('INSERT INTO projects (id, name, description, color, owner_id) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, description || null, color || '#6366f1', req.user.id);
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
      .run(id, req.user.id, 'admin');
  });
  insert();

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json({ project: { ...project, my_role: 'admin', member_count: 1, task_count: 0, done_count: 0 } });
});

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, requireProjectRole(['admin', 'member']), (req, res) => {
  const { projectId } = req.params;
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name, pm.role as my_role,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.owner_id
    WHERE p.id = ?
  `).get(req.user.id, projectId);

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY pm.role DESC, pm.joined_at ASC
  `).all(projectId);

  res.json({ project, members });
});

// PATCH /api/projects/:projectId - update project (admin only)
router.patch('/:projectId', authenticate, requireProjectRole(['admin']), [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, color } = req.body;
  const { projectId } = req.params;

  const fields = [];
  const vals = [];
  if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
  if (description !== undefined) { fields.push('description = ?'); vals.push(description); }
  if (color !== undefined) { fields.push('color = ?'); vals.push(color); }

  if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  vals.push(projectId);
  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  res.json({ project });
});

// DELETE /api/projects/:projectId (admin only)
router.delete('/:projectId', authenticate, requireProjectRole(['admin']), (req, res) => {
  // Only owner can delete
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (project.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the project owner can delete it' });
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:projectId/members - invite by email (admin only)
router.post('/:projectId/members', authenticate, requireProjectRole(['admin']), [
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, role } = req.body;
  const { projectId } = req.params;

  const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found. They must sign up first.' });

  const existing = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, user.id);
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(projectId, user.id, role);
  res.status(201).json({ member: { ...user, role } });
});

// PATCH /api/projects/:projectId/members/:userId - change role (admin only)
router.patch('/:projectId/members/:userId', authenticate, requireProjectRole(['admin']), [
  body('role').isIn(['admin', 'member']),
], (req, res) => {
  const { projectId, userId } = req.params;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

  if (userId === project.owner_id) {
    return res.status(403).json({ error: 'Cannot change owner role' });
  }

  db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?')
    .run(req.body.role, projectId, userId);
  res.json({ message: 'Role updated' });
});

// DELETE /api/projects/:projectId/members/:userId (admin only)
router.delete('/:projectId/members/:userId', authenticate, requireProjectRole(['admin']), (req, res) => {
  const { projectId, userId } = req.params;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

  if (userId === project.owner_id) {
    return res.status(403).json({ error: 'Cannot remove project owner' });
  }

  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId);
  // Unassign their tasks
  db.prepare('UPDATE tasks SET assignee_id = NULL WHERE project_id = ? AND assignee_id = ?').run(projectId, userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
