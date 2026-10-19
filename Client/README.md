# StaffSync — Client

The StaffSync web app: **React 18 + Vite + plain CSS**.

It is the front end of the full-stack project and talks to the Express +
MongoDB API in `../Server`. (A browser-only mock mode still exists for design
demos, but it is no longer the default.)

> Full setup, database, API reference and troubleshooting live in
> [`../README.md`](../README.md). This file covers the client itself.

## Quick start

The API must be running on <http://localhost:5000> first.

```bash
cd Client
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the build on :4173
```

Requires Node 18+. Dependencies: `react`, `react-dom`, `react-router-dom`
(dev: `vite`, `@vitejs/plugin-react`). No UI library — all styling is plain CSS.

## Configuration

All optional. Create `Client/.env` only if you need to change a default.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_MODE` | `live` | `mock` runs the in-browser demo with no backend |
| `VITE_API_URL` | `/api` | Absolute API base URL (skips the dev proxy) |
| `VITE_API_PROXY` | `http://127.0.0.1:5000` | Target for the `/api` dev proxy |
| `VITE_DEMO_LOGINS` | `false` | `true` re-enables the one-click role cards on `/login` |

The Vite dev server strips the `Origin` header on proxied requests so the API's
CORS allowlist (`CLIENT_URL`) stays strict while previews and remote dev hosts
still work. Keep that hook if you edit `vite.config.js`.

## Demo accounts

Only exist after `npm run seed` in `../Server`; password **`StaffSync@123`**.
They are bcrypt-hashed accounts, not a client-side bypass — the role cards are
hidden in live mode and can be removed entirely with `VITE_DEMO_LOGINS=false`.

| Role | Email |
| --- | --- |
| HR | `priya.sharma@nimbuslabs.com` |
| Manager | `rohan.kapoor@nimbuslabs.com` |
| Employee | `aarav.mehta@nimbuslabs.com` |

## Folder map

```
src/
├─ App.jsx                  route table (role-guarded)
├─ main.jsx                 providers + stylesheet imports (order matters)
├─ auth/                    LoginPage, RegisterPage (2-step), options
├─ components/
│  ├─ ui/                   reusable primitives (Button, Card, Modal, DataTable…)
│  ├─ layout/               AppLayout, Sidebar, Topbar, menus, ProtectedRoute
│  ├─ dashboard/            HrDashboard, ManagerDashboard, EmployeeDashboard
│  ├─ employees/            EmployeeFormModal, EmployeeDrawer, options
│  ├─ leaves/               request form, request modal, decision/details modals
│  ├─ announcements/        AnnouncementComposer
│  ├─ attendance/           AttendanceCalendar
│  └─ training/             CourseCard, CourseModal, AssignTrainingModal
├─ pages/                   one file per route
├─ styles/                  base, ui, components, layout, pages, dashboard,
│                           auth, employees, attendance, leaves, announcements,
│                           training, profile, settings, notifications, toast
├─ services/                api.js (facade) · liveApi.js · mockApi.js · http.js
├─ context/                 AuthContext, DataContext, ToastContext
├─ hooks/ · utils/ · config/ · data/seed.js
```

`main.jsx` imports `base → ui → components → toast → layout → pages → dashboard`
first, then the page-level stylesheets. Keep that order: page CSS must win over
the shared layer, and everything must load after the design tokens.

## The service layer

Components never call `fetch`. The chain is:

```
component → context → services/api.js → liveApi.js → http.js → /api/*
```

`api.js` picks `liveApi.js` or `mockApi.js` from `VITE_API_MODE`. `http.js` owns
the base URL, the `Authorization: Bearer` header, JSON parsing, error mapping
(`error.status`, `error.details`, `error.offline`) and the 401 → sign-out path.

| UI method | REST call |
| --- | --- |
| `api.auth.login` / `register` / `me` | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| `api.employees.list/create/update/remove` | `GET/POST /employees`, `PATCH/DELETE /employees/:id` |
| `api.leaves.list/apply/decide/cancel` | `/leaves` |
| `api.attendance.list/today/clockIn/clockOut` | `/attendance` |
| `api.announcements.list/create/update/remove/markRead` | `/announcements` |
| `api.training.list/assign/enroll/progress` | `/training` |
| `api.registrations.list/decide` | `/registrations` |
| `api.notifications.list/markRead/markAllRead` | `/notifications` |
| `api.settings.get/save` | `/settings/:employeeId` |
| `api.activity.list` | `/activity` |

## Behaviour notes

- **Session** — the JWT and user are stored under `staffsync.session.v1`.
  `AuthContext` calls `GET /auth/me` on load, so a refresh keeps you signed in.
  A 401 clears the session, sets `staffsync.sessionExpired`, and `/login` explains
  why. A network failure keeps the token and says the API is unreachable.
- **Data** — `DataContext` loads every collection the role needs, exposes
  `loadError`/`clearLoadError`, and `AppLayout` shows a retry banner when a load
  fails with a 5xx/offline error.
- **Permissions** — the UI hides what a role cannot do, and the server enforces it
  again. Navigating to `/employees` as an employee redirects you away.
- **Mock mode** — `VITE_API_MODE=mock` keeps the original localStorage prototype
  alive for design reviews. Its toasts say "demo" and Settings exposes a reset.

## Notes

- Fonts (Inter) are self-hosted in `src/assets/fonts`, so the UI needs no network.
- `vite.config.js` allows the sandbox preview host; for production, replace
  `allowedHosts: true` with your real domain.
- This client targets the server in `../Server`. The old `/home/user/Server`
  prototype is unrelated and untouched.
