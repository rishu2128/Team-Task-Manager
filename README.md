# TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control, built with Node.js/Express + SQLite backend and React frontend.

## Features

- **Authentication** — JWT-based signup/login, persistent sessions
- **Projects** — Create projects with custom colors, invite team members
- **Role-Based Access** — Admin (full control) vs Member (restricted editing)
- **Tasks** — Create, assign, prioritize, set due dates, track status
- **Kanban Board** — Drag-free board with quick status updates
- **List View** — Sortable table view with filters
- **Dashboard** — Personal stats, overdue alerts, progress tracking
- **Comments** — Per-task threaded comments
- **Overdue Detection** — Visual indicators for past-due tasks

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite via better-sqlite3 |
| Auth | JWT + bcryptjs |
| Frontend | React 18 + React Router v6 |
| Build | Vite |
| Deployment | Railway |

## Project Structure

```
taskflow/
├── backend/
│   ├── models/db.js          # SQLite setup & schema
│   ├── middleware/auth.js     # JWT auth + role middleware
│   ├── routes/
│   │   ├── auth.js           # POST /signup, /login, GET /me
│   │   ├── projects.js       # CRUD projects + member management
│   │   ├── tasks.js          # CRUD tasks + comments
│   │   └── dashboard.js      # Aggregated stats
│   └── server.js             # Express app entry
├── frontend/
│   └── src/
│       ├── pages/            # LoginPage, SignupPage, DashboardPage, ProjectsPage, ProjectDetailPage
│       ├── components/       # Sidebar, TaskModal, TaskDetailModal, UI primitives
│       ├── context/          # AuthContext, ToastContext
│       └── api.js            # Axios instance with interceptors
├── railway.toml
└── package.json              # Root build scripts
```

## API Endpoints

### Auth
```
POST /api/auth/signup     { name, email, password }
POST /api/auth/login      { email, password }
GET  /api/auth/me         (authenticated)
```

### Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id              (admin)
DELETE /api/projects/:id              (owner)
POST   /api/projects/:id/members      (admin)
PATCH  /api/projects/:id/members/:uid (admin)
DELETE /api/projects/:id/members/:uid (admin)
```

### Tasks
```
GET    /api/projects/:id/tasks                    ?status=&priority=&assignee=&search=
POST   /api/projects/:id/tasks
PATCH  /api/projects/:id/tasks/:tid
DELETE /api/projects/:id/tasks/:tid
GET    /api/projects/:id/tasks/:tid/comments
POST   /api/projects/:id/tasks/:tid/comments
```

### Dashboard
```
GET /api/dashboard
```

## Role Permissions

| Action | Admin | Member |
|--------|-------|--------|
| Create/edit/delete any task | ✅ | ❌ |
| Edit own tasks | ✅ | ✅ |
| Edit assigned tasks | ✅ | ✅ |
| Invite/remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| Delete project | Owner only | ❌ |

## Local Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend (port 5000)
cd backend && npm run dev

# Start frontend (port 5173)
cd frontend && npm run dev
```

Frontend dev server proxies `/api` requests to `localhost:5000`.


## Database Schema

```sql
users            -- id, name, email, password_hash, avatar_color
projects         -- id, name, description, color, owner_id
project_members  -- project_id, user_id, role (admin|member)
tasks            -- id, title, description, status, priority, project_id, assignee_id, due_date
task_comments    -- id, task_id, user_id, content
```
