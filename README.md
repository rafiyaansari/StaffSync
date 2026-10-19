# StaffSync — full-stack HR management

StaffSync is a complete HR workspace for a small company: people directory, time-off
requests, attendance, announcements, training and role-aware dashboards.

This repository contains **both halves of the application**:

| Folder | What it is | Stack |
| --- | --- | --- |
| `Client/` | The web app you see in the browser | React 18 + Vite + plain CSS |
| `Server/` | The REST API and database layer | Node.js + Express + MongoDB (Mongoose) + JWT |

Everything the UI shows comes from the API. There is no mock data in the running
app (mock mode still exists, but only if you explicitly switch it on for a
no-backend demo).

![HR dashboard](docs/screenshots/03-hr-dashboard.png)

## First run in six commands

For a fresh extraction on Windows (details for every step are below):

```powershell
cd path\to\StaffSync\Server
npm install
Copy-Item .env.example .env      # then edit MONGO_URI + JWT_SECRET in Notepad
npm run seed                      # safe: refuses to touch a non-empty database
npm run dev                       # leave this window running (API on :5000)
```

```powershell
cd path\to\StaffSync\Client      # second PowerShell window
npm install
npm run dev                       # open http://localhost:5173
```

Sign in with `priya.sharma@nimbuslabs.com` / `StaffSync@123`.

If anything looks wrong, run `npm run db:doctor` in `Server/` — it tells you
exactly which part of the database or account setup is off.

---

## Contents

1. [First run in six commands](#first-run-in-six-commands)
2. [What was repaired in this build](#what-was-repaired-in-this-build)
3. [What you get](#1-what-you-get)
4. [Requirements](#2-requirements)
5. [Create the database (MongoDB Atlas)](#3-create-the-database-mongodb-atlas)
6. [Run the backend](#4-run-the-backend)
7. [Run the frontend](#5-run-the-frontend)
8. [Sign in + demo accounts](#6-sign-in--demo-accounts)
9. [Environment variables](#7-environment-variables)
10. [Everyday commands](#8-everyday-commands)
11. [API reference + required roles](#9-api-reference--required-roles)
12. [Business rules enforced by the server](#10-business-rules-enforced-by-the-server)
13. [Security notes](#11-security-notes)
14. [Automated tests + acceptance results](#12-automated-tests)
15. [Troubleshooting](#13-troubleshooting)
16. [Project structure](#14-project-structure)
17. [Manual QA checklist](#15-manual-qa-checklist)
18. [Known limitations](#16-known-limitations)

---

## 1. What you get

### Screens

| Area | Route | HR | Manager | Employee |
| --- | --- | :-: | :-: | :-: |
| Dashboard | `/dashboard` | ✅ company pulse | ✅ team pulse | ✅ personal pulse |
| Employee directory | `/employees` | ✅ full CRUD | – | – |
| Registration requests | `/employees/requests` | ✅ approve / decline | – | – |
| Team | `/team` | – | ✅ own team | – |
| Attendance | `/attendance` | ✅ everyone | ✅ own team | ✅ own |
| Leave management | `/leaves` | ✅ review all | ✅ review team | ✅ apply / cancel own |
| Announcements | `/announcements` | ✅ create / edit / delete | ✅ read | ✅ read |
| Training | `/training` | ✅ assign + track | ✅ assign + track | ✅ enroll + progress |
| Notifications | `/notifications` | ✅ | ✅ | ✅ |
| Profile | `/profile` | ✅ | ✅ | ✅ |
| Settings | `/settings` | ✅ | ✅ | ✅ |

Login (`/login`), registration (`/register`) and a 404 page are public.

## What was repaired in this build

The delivered project is the same UI and API as before, with these defects fixed:

| Issue | Root cause | Fix |
| --- | --- | --- |
| Sign-in showed *"Cannot read properties of undefined (reading 'name')"* and never reached the dashboard | `completeLogin()` dereferenced `user.name`; the API client returned `user: undefined` whenever the login body had no `user` key (wrong port, out-of-date backend, or a 200 error page). A 401 was also surfaced through that same unguarded path. | `Client/src/services/authPayload.js` validates `{ token, user }` (accepting `{data:…}`, `accessToken`, `employee` shapes) and throws a readable error; `liveApi`, `AuthContext` and `LoginPage` all guard before use. The employee dashboard now uses optional chaining like the HR/manager dashboards. |
| Seeded login could return 401 without an explanation | Diagnosis required reading code; email lookup did not normalise whitespace, and an account with no employee link answered with a vague 403. | Login now trims/lowercases like the schema does, explains a missing profile, and refuses a missing password hash. New `npm run db:doctor` reports password/status/link per demo account; `--fix-demo-passwords` repairs only those three. |
| "Is login working?" could not be answered without the browser | No script exercised the real auth chain. | `npm run verify:auth` boots a temporary API and asserts health → 401 → 200 → `/me` → anonymous 401. |
| Windows DNS workaround was ad-hoc | The override had to be installed in-process before Mongoose connects. | `scripts/dns-preload.mjs` + `scripts/dns-override.mjs` behind opt-in scripts (`dev:dns`, `db:doctor:dns`, `verify:auth:dns`). Never loaded by normal start. Documented in §13. |
| New regression coverage | — | `Server/tests/login-contract.test.js` (9 tests) and `Client/tests/authPayload.test.js` (8 tests). |

### A quick tour

| Employee dashboard | Manager team view |
| --- | --- |
| ![Employee dashboard](docs/screenshots/11-employee-dashboard.png) | ![Manager team](docs/screenshots/16-manager-team.png) |

| Leave management (HR) | Training |
| --- | --- |
| ![Leave management](docs/screenshots/06-leaves-hr.png) | ![Training](docs/screenshots/09-training-hr.png) |

All screenshots in [`docs/screenshots`](docs/screenshots) were captured from the
running app (React + Express + MongoDB), not from a design mock.

### Highlights

- Sign-up with HR approval — a new account stays **pending** until HR approves it.
- JWT authentication, bcrypt password hashing, protected API routes.
- Role checks on the server for every protected operation (not just hidden buttons).
- Session restore on refresh; expired or tampered tokens return you to sign-in.
- Real loading, empty, error and success states — no fake "saved" toasts.
- Responsive, accessible UI with plain CSS (no UI framework).

---

## 2. Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 18.18 or newer (tested on 20.20.2 and 24.x) | https://nodejs.org — LTS installer recommended |
| npm | comes with Node | `npm -v` should print a version |
| MongoDB | Atlas free tier (recommended) | or the built-in `npm run db:memory` option |
| Browser | Chrome, Edge or Firefox | |

You do **not** need to install MongoDB locally, Docker, or any global npm package.

> **Windows tip:** all commands below work in **PowerShell**. Run them one line at
> a time — older PowerShell versions do not support `&&`.

---

## 3. Create the database (MongoDB Atlas)

Skip this section if you only want a quick local test and will use
[`npm run db:memory`](#option-b-no-atlas-account-quick-test) instead.

1. Go to <https://www.mongodb.com/cloud/atlas/register> and create a free account.
2. **Create a cluster** → choose **M0 Free** → pick the region closest to you → Create.
3. **Database Access** (left menu) → *Add New Database User*
   - Authentication: **Password**
   - Username: `staffsync`
   - Password: click *Autogenerate* and **copy it somewhere safe**
   - Role: *Read and write to any database*
4. **Network Access** → *Add IP Address*
   - For local development choose **Add Current IP Address**.
   - If your home IP changes often you can use `0.0.0.0/0` (allow from anywhere),
     but understand that this is less secure — never do it for production.
5. **Database → Connect → Drivers** → copy the connection string. It looks like:

   ```text
   mongodb+srv://staffsync:<db_password>@cluster0.abcd123.mongodb.net/?retryWrites=true&w=majority
   ```

6. Edit it before use:
   - replace `<db_password>` with the password from step 3 (URL-encode special
     characters like `@` → `%40`, `#` → `%23`);
   - add the database name **`staffsync`** right after `.net/`:
     `.net/staffsync?retryWrites=true&w=majority`

Your finished value looks like:

```text
mongodb+srv://staffsync:<db_password>@cluster0.abcd123.mongodb.net/staffsync?retryWrites=true&w=majority
```

That string goes into `Server/.env` in the next step. **Never commit it to Git.**

---

## 4. Run the backend

Open **PowerShell**, then:

```powershell
cd path\to\StaffSync\Server
npm install
```

Create your environment file:

```powershell
Copy-Item .env.example .env
notepad .env
```

Fill in at least these values (everything else can stay as-is):

```dotenv
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://staffsync:YOUR_PASSWORD@cluster0.abcd123.mongodb.net/staffsync?retryWrites=true&w=majority
JWT_SECRET=<paste a long random string>
CLIENT_URL=http://localhost:5173
```

Generate a strong `JWT_SECRET` with Node (copy the output into `.env`):

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server validates the file on boot and refuses to start with a missing or
placeholder secret, a malformed `MONGO_URI`, or an invalid port.

### Seed the demo workspace (first run only)

```powershell
npm run seed
```

This creates 24 employees, their sign-in accounts, 16 leave requests, ~780
attendance records, 5 announcements, 6 training programmes, notifications and
2 pending registration requests. Every demo account is bcrypt-hashed in MongoDB
with the password **`StaffSync@123`** (override with `SEED_DEMO_PASSWORD` before
seeding).

Re-run `npm run seed -- --reset` any time to wipe and rebuild the demo data.
Use `npm run seed -- --if-empty` to seed only when the database is empty.

### Start the API

```powershell
npm run dev
```

You should see:

```text
[StaffSync] MongoDB connected — cluster0-shard-00-00.abcd123.mongodb.net/staffsync
[StaffSync] API listening on http://localhost:5000
```

Check it in a browser: <http://localhost:5000/api/health>

```json
{ "data": { "status": "ok", "database": "connected", "uptimeSeconds": 12 } }
```

`npm start` runs the server without nodemon (used in production).

### Option B: no Atlas account (quick test)

The repo includes a throwaway in-memory MongoDB for local experiments:

```powershell
# terminal 1 — keep this running
cd Server
npm run db:memory

# terminal 2 — point the server at it
$env:MONGO_URI="mongodb://127.0.0.1:27017/staffsync"
npm run seed
npm run dev
```

Data disappears when you stop `db:memory`. It is perfect for trying the app or
running the test suite, but not for keeping real records.

---

## 5. Run the frontend

Open a **second** PowerShell window:

```powershell
cd path\to\StaffSync\Client
npm install
npm run dev
```

Open <http://localhost:5173>.

No `.env` is required: the client calls `/api`, and the Vite dev server proxies
that to `http://127.0.0.1:5000` (see `vite.config.js`). If your API runs on a
different port, create `Client/.env` with `VITE_API_PROXY=http://127.0.0.1:5001`
(or set `VITE_API_URL=http://localhost:5001/api` to bypass the proxy).

Production build:

```powershell
npm run build      # output in Client/dist
npm run preview    # serve the build locally on :4173
```

When you host the build elsewhere, set:

```dotenv
VITE_API_URL=https://your-api.example.com/api
```

and add that frontend origin to `CLIENT_URL` in `Server/.env` so CORS allows it.

---

## 6. Sign in + demo accounts

The seed script creates three accounts you can use immediately:

| Role | Email | Password |
| --- | --- | --- |
| **HR** | `priya.sharma@nimbuslabs.com` | `StaffSync@123` |
| **Manager** | `rohan.kapoor@nimbuslabs.com` | `StaffSync@123` |
| **Employee** | `aarav.mehta@nimbuslabs.com` | `StaffSync@123` |

> **These are seeded demo accounts, not a hidden back door.** They exist only
> if you ran `npm run seed`, their passwords are stored as bcrypt hashes, and
> the one-click role buttons on the sign-in screen can be hidden with
> `VITE_DEMO_LOGINS=false` in `Client/.env`. For a real deployment, change the
> password (`SEED_DEMO_PASSWORD`), delete the demo users, or skip seeding.

You can also create your own account from **Create your account**. It lands in
HR's **Registrations** queue and cannot sign in until approved.

---

## 7. Environment variables

### `Server/.env`

| Variable | Required | Default | Purpose |
| --- | :-: | --- | --- |
| `NODE_ENV` | – | `development` | `development`, `production` or `test` |
| `PORT` | – | `5000` | API port |
| `MONGO_URI` | ✅ | – | MongoDB Atlas or local connection string |
| `JWT_SECRET` | ✅ | – | 32+ random characters used to sign tokens |
| `JWT_EXPIRES_IN` | – | `7d` | Token lifetime (`1h`, `7d`, …) |
| `CLIENT_URL` | – | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |
| `BCRYPT_ROUNDS` | – | `12` | Password hash cost |
| `JSON_BODY_LIMIT` | – | `2mb` | Maximum request size (avatars are data URIs) |
| `RATE_LIMIT_WINDOW_MS` | – | `900000` | Login/register rate-limit window |
| `RATE_LIMIT_MAX` | – | `50` | Attempts per window per IP |
| `SEED_ON_START` | – | `false` | Seed automatically on boot when the DB is empty |
| `SEED_DEMO_PASSWORD` | – | `StaffSync@123` | Password for seeded demo accounts |

Only `Server/.env.example` is committed; the real `.env` is git-ignored.

### `Client/.env` (optional)

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_MODE` | `live` | Set `mock` for the original browser-only demo (no server) |
| `VITE_API_URL` | `/api` | Absolute API base URL (skips the Vite proxy) |
| `VITE_API_PROXY` | `http://127.0.0.1:5000` | Where the dev proxy forwards `/api` |
| `VITE_DEMO_LOGINS` | `false` in live mode | `true` shows the one-click role buttons |

---

## 8. Everyday commands

### Server (`cd Server`)

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Start once |
| `npm run seed` | Seed demo data — **refuses to touch a non-empty database** |
| `npm run seed -- --reset` | Wipe and rebuild the demo workspace (destructive, explicit) |
| `npm run db:doctor` | Check the accounts the app signs in with; exits 1 if broken |
| `npm run db:doctor -- --fix-demo-passwords` | Reset the 3 demo passwords in place (nothing deleted) |
| `npm run verify:auth` | Boot a temporary API and test login/me/401 against your database |
| `npm test` | Run the backend test suite |
| `npm run db:memory` | Throwaway MongoDB on `127.0.0.1:27017` |
| `npm run dev:dns` | Start the API with the optional DNS override (see §13) |

### Client (`cd Client`)

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on <http://localhost:5173> |
| `npm run build` | Production build in `dist/` |
| `npm run preview` | Serve the production build on `:4173` |
| `npm test` | Response-contract tests for the sign-in payload |

---

## 9. API reference + required roles

Base URL: `http://localhost:5000/api`. Every endpoint returns `{ "data": ... }`
on success and `{ "message": "...", "errors": { ... } }` on failure.

`Auth` column legend: **–** public, **Any** any signed-in user, **HR**, **Mgr**,
**Self** only your own record, **Mgr+** the employee's direct manager or HR.

### Auth

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | Submit a registration request (creates a pending account) |
| POST | `/auth/login` | – | Email + password → `{ token, user }` |
| GET | `/auth/me` | Any | Restore the session / current profile |
| PUT | `/auth/password` | Any | Change your own password (current password required) |

### Employees

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/employees` | Any | Directory (private fields only for self / HR / your manager) |
| GET | `/employees/:id` | HR, Self, Mgr+ | One profile |
| POST | `/employees` | HR | Create employee (+ optional sign-in account) |
| PUT | `/employees/:id` | HR, Self | Update profile; only HR may change role/manager/status |
| DELETE | `/employees/:id` | HR | Remove employee and cascade leave/attendance/settings |

### Leaves

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/leaves` | Any | Scoped list (`?employeeId=&status=&from=&to=`) |
| POST | `/leaves` | Self | Apply for leave |
| PATCH | `/leaves/:id/status` | HR, Mgr+ | Approve / reject a pending request |
| PATCH | `/leaves/:id/cancel` | Self | Withdraw your own pending request |

### Attendance

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/attendance` | Any | Scoped records (`?employeeId=&from=&to=&page=&limit=`) |
| GET | `/attendance/today` | Any | Today's records in your scope |
| POST | `/attendance/clock-in` | Self | `{ mode: "office" \| "remote" }`, once per day |
| POST | `/attendance/clock-out` | Self | Close today's record and compute hours |

### Announcements

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/announcements` | Any | Audience-filtered list (pinned first) |
| POST | `/announcements` | HR | Publish (+ notify everyone) |
| PATCH | `/announcements/:id` | HR | Edit |
| DELETE | `/announcements/:id` | HR | Delete |
| POST | `/announcements/:id/read` | Any | Mark read for yourself |

### Training

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/training` | Any | Catalogue with enrollments |
| POST | `/training/:id/enroll` | Self | Enroll yourself |
| PATCH | `/training/:id/progress` | Self, HR | Update progress 0–100 |
| POST | `/training/:id/assign` | HR, Mgr+ | Assign to people (manager: direct team only) |

### Notifications, registrations, settings, activity

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/notifications` | Any | Your personal + role broadcasts |
| PATCH | `/notifications/:id/read` | Owner | Mark one read |
| PATCH | `/notifications/read-all` | Any | Mark every visible notification read |
| GET | `/registrations` | HR | Pending / decided requests |
| PATCH | `/registrations/:id` | HR | Approve (creates employee + activates account) or decline |
| GET | `/settings/:employeeId` | Self, HR | Notification preferences |
| PUT | `/settings/:employeeId` | Self, HR | Save preferences |
| GET | `/activity` | Any | Scoped activity feed (`?limit=`) |
| GET | `/health` | – | API + database status |

All list endpoints also accept the filters shown above; attendance supports
optional `page` / `limit` pagination and returns `meta` when used.

---

## 10. Business rules enforced by the server

These are not cosmetic — they live in the controllers and are covered by tests.

**Accounts & auth**
- Emails are unique across employees, accounts and pending registrations (409).
- Passwords are bcrypt-hashed (cost 12 by default) and never returned by any endpoint.
- Pending accounts cannot sign in; declined accounts are blocked; the same generic
  message is returned for a wrong email and a wrong password.
- Tokens are signed with `JWT_SECRET`, verified on every request, and expire.
- The last HR administrator cannot be deleted or demoted.

**Leave**
- `to` must be on/after `from`; both must be real calendar dates.
- A request cannot overlap an existing Pending or Approved request.
- Paid leave cannot exceed the remaining balance for that type.
- Only Pending requests can be decided; decisions record reviewer + date.
- Approval increments the employee's `used` balance, capped at the entitlement
  (never for unpaid leave); rejection does not touch it.
- You can only cancel your own Pending request.
- Nobody can approve their own request.
- HR can decide anyone's; a manager only their direct reports'.

**Attendance**
- One record per employee per day.
- Clock-in is once per day; after 09:45 it is marked **Late**; remote is **WFH**.
- Clock-out requires a clock-in and can happen once; hours = out − in − 30 min
  break, never negative.
- You can only clock yourself in/out.

**Training**
- Progress is clamped to 0–100 and maps to Not started / In progress / Completed
  (with `completedOn`).
- You cannot enroll twice; you can only enroll yourself.
- Managers can only assign to their direct team; HR to anyone.

**Announcements**
- Only HR can write; everyone can read what their audience allows.
- Marking read is idempotent; you cannot mark an announcement you cannot see.

**Registrations**
- Approving creates the employee (Probation), links and activates the account,
  and sends a welcome notification. A request can only be decided once.

---

## 11. Security notes

- Passwords: bcrypt, never logged, never serialized, excluded from queries by default.
- Tokens: Bearer JWT; the API checks signature + expiry on every protected route.
- Authorization is enforced in middleware **and** in the controller (ownership /
  manager-of-record checks), so hiding a button is never the only protection.
- Input validation with Zod on every write: unknown fields are rejected or stripped,
  which also blocks mass-assignment attempts (`systemRole`, `leave`, `_id`, …).
- Mongoose schemas add a second layer of validation and enums.
- `helmet` sets safe HTTP headers; `cors` allowlists `CLIENT_URL`.
- Request bodies are limited to 2 MB, JSON only.
- Login/register are rate-limited (`RATE_LIMIT_MAX` per 15 min per IP).
- Error responses never include stack traces in production, and logs never print
  request bodies, passwords, tokens or the MongoDB URI (host + DB name only).
- Directory data is trimmed by role: colleagues don't see phone numbers, date of
  birth, address or emergency contacts; HR, the person and their manager do.

**Before deploying:** change `SEED_DEMO_PASSWORD`, delete or disable demo users,
set `VITE_DEMO_LOGINS=false`, use a managed secret for `JWT_SECRET`, restrict
Atlas network access, and serve the API over HTTPS.

---

## 12. Automated tests

```powershell
cd Server
npm test
```

The suite uses **`mongodb-memory-server`** (a real MongoDB binary started in a
temporary folder) and **Supertest**, so it needs **no Atlas credentials** and
never touches your data.

```
# tests 177
# suites 39
# pass 177
# fail 0
# duration_ms ~32s
```

Frontend contract tests: `cd Client; npm test` → **8/8 passing**.

Coverage groups:

| File | What it proves |
| --- | --- |
| `tests/auth.test.js` | register validation, duplicate emails, pending accounts, login, `/me`, expiry, password change |
| `tests/rbac.test.js` | unauthenticated requests blocked, HR-only routes, manager/employee scoping, own-record rules |
| `tests/employees.test.js` | CRUD, duplicate emails, mass-assignment guard, last-HR protection, cascade delete, private-field filtering |
| `tests/leaves.test.js` | date validation, overlap, balances, decisions, reviewer rules, cancellation, notifications |
| `tests/attendance.test.js` | clock-in/out rules, late/WFH status, one record per day, hours, scoping, pagination |
| `tests/announcements.test.js` | HR-only writes, audience filtering, read tracking, ordering |
| `tests/training.test.js` | enroll / progress / assign rules, manager scope, notifications |
| `tests/registrations.test.js` | approval creates an account, decline blocks sign-in, duplicate decisions |
| `tests/misc.test.js` | health, 404, malformed JSON, CORS, settings, notifications, activity, no secrets leaked |
| `tests/seed.test.js` | the demo seed produces the exact counts and shapes the UI expects |
| `tests/login-contract.test.js` | login always returns `{ token, user }`, email normalisation, 401/403 shapes, no password leakage |

### Acceptance run — login + core HR features (final build)

Executed against the real React app → real Express API → real MongoDB
(Playwright + Chromium, 1440×960). **17/17 checks passed, 0 page exceptions.**

| # | Check | Observed result |
| --- | --- | --- |
| 1 | HR demo account signs in through the UI | ✅ `/dashboard`, "Good afternoon, Priya" |
| 2 | Dashboard renders live stat cards | ✅ 4 cards |
| 3 | Head-count on screen matches the database | ✅ 26 employees (after the test created one) |
| 4 | HR approves a leave request | ✅ pending **6 → 5**, toast "Leave approved" |
| 5 | HR publishes an announcement | ✅ read back from the API afterwards |
| 6 | HR creates an employee | ✅ `EMP-027` created |
| 7 | That new employee can sign in | ✅ 200, role `employee` |
| 8 | HR approves a registration request | ✅ pending **2 → 1** (two-step confirm) |
| 9 | Attendance page renders live records | ✅ no `undefined`/`NaN` |
| 10 | Training page lists real programmes | ✅ 6 programmes |
| 11 | Refresh keeps the session | ✅ stays on `/dashboard` |
| 12 | Sign out clears the session | ✅ back to `/login`, storage empty |
| 13 | Employee blocked from the HR directory | ✅ redirected to `/dashboard` |
| 14 | Server blocks an employee calling an HR endpoint | ✅ `403` |
| 15 | Manager dashboard loads team data | ✅ no page errors |
| 16 | Regression: 200 response with no `user` field | ✅ shows a message, no `TypeError` |
| 17 | API base URL + proxy from the browser origin | ✅ `/api/health` → `connected` |

Verification before packaging:

| Command | Result |
| --- | --- |
| `cd Server; npm test` | **177 / 177** passing, 39 suites |
| `cd Client; npm test` | **8 / 8** passing |
| `cd Client; npm run build` | ✅ built (417 kB JS, 132 kB CSS) |
| `npm run db:doctor` | ✅ 5/5 checks green |
| `npm run verify:auth` | ✅ 8/8 auth checks |
| Fresh-extract rehearsal (unzip → install → seed → login in browser) | ✅ 0 errors |

> **MongoDB Atlas was not exercised here** — no Atlas credentials exist in this
> build environment, so every run above used a local MongoDB through the same
> Mongoose models, indexes and queries. The Atlas-specific paths that *were*
> verified: the `mongodb+srv://` URI is accepted and parsed, DNS failure produces
> `querySrv ENOTFOUND …` with a credential-free message, and the optional DNS
> override engages only when explicitly invoked. On your machine, run
> `npm run db:doctor` and `npm run verify:auth` — these are the two commands that
> confirm Atlas in about five seconds.

Also verified during development with Playwright against the real server + MongoDB:

- **16/16 UI flows**: HR approve leave, publish announcement, create employee,
  approve registration, mark notifications read, sign out; employee clock in/out,
  apply + withdraw leave, enroll + complete training, profile edit persists,
  blocked from HR pages; manager team view, leave review, training assignment.
- **5/5 auth flows**: registration → pending block → HR approval → sign-in;
  invalidated session returns to sign-in with an expiry message.
- **Avatar upload** end to end: choose a PNG → save → reload → image is still
  there (stored as a data URI on the employee record).
- 0 console errors.

> **Honest note about Atlas:** the API code path is identical for Atlas and the
> in-memory server (same Mongoose models and queries), but the tests above ran
> against `mongodb-memory-server` because no Atlas credentials exist in this
> environment. Your Atlas connection is therefore verified by you at first boot —
> `GET /api/health` and `npm run seed` are the quickest confirmation.

---

## 13. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Invalid server configuration: JWT_SECRET is required` | Create `Server/.env` from `.env.example` and fill it in. |
| `JWT_SECRET still looks like a placeholder` | Replace the example text with a real random string. |
| `MongoServerSelectionError` / timeout | Atlas IP allowlist, wrong password, or a paused cluster. Check Network Access and Database Access. |
| Password contains `@` or `#` | URL-encode it (`%40`, `%23`) inside `MONGO_URI`. |
| `EADDRINUSE :5000` | Another program uses the port — stop it or set `PORT=5001` and `VITE_API_PROXY=http://127.0.0.1:5001`. |
| Login says network error / API unreachable | Is the backend running? Does `http://localhost:5000/api/health` respond? |
| Browser shows a CORS error | Add the exact frontend origin to `CLIENT_URL` (scheme + host + port). |
| `401` right after signing in | `JWT_SECRET` changed between issuing and verifying the token — sign in again. |
| Demo login buttons missing | They are hidden in live mode by default; set `VITE_DEMO_LOGINS=true` or sign in with the emails above. |
| `npm install` fails on Windows | Use an LTS Node version and run PowerShell as a normal user (not as admin). |
| `mongodb-memory-server` download fails | The test helper downloads a MongoDB binary once; check your connection/proxy or use `MONGOMS_SYSTEM_BINARY`. |

### Sign-in returns 401 / "email and password don't match"

The API is running, the database is connected, but the seeded account is not
what the app expects (different database, different `SEED_DEMO_PASSWORD`, or a
partially restored dump). Diagnose it in one command:

```powershell
cd Server
npm run db:doctor
```

It prints the host and database it actually connected to, the row counts, and
each demo account as `password OK / status active / linked profile`. If it
reports a problem:

```powershell
npm run db:doctor -- --fix-demo-passwords
```

That resets **only** the three documented demo accounts (password, status and the
employee link). It never deletes data and never touches real accounts. If the
database is empty, run `npm run seed` instead.

To confirm the whole auth path end to end (boots a temporary API on a random
port, so your running server is untouched):

```powershell
npm run verify:auth
```

### MongoDB Atlas fails with `querySrv ENOTFOUND` / `ECONNREFUSED` on Windows

Some Windows setups (VPN clients, corporate DNS, some ISP resolvers) cannot
resolve MongoDB's `_mongodb._tcp` SRV records. Symptoms: the connection string is
correct in Atlas, but Node reports `querySrv ENOTFOUND _mongodb._tcp.<cluster>`.

This project ships an **optional, development-only** DNS override. It changes the
DNS servers for that one Node process and nothing else:

A one-liner like `node -e "require('dns').setServers(...)"` cannot help here,
because the override has to be installed in the *same process* before MongoDB
connects. Use the provided scripts, which do exactly that:

```powershell
npm run dev:dns            # API with the override
npm run db:doctor:dns      # doctor with the override
npm run verify:auth:dns    # auth check with the override
```

You can choose different resolvers with `DNS_SERVERS`:

```powershell
$env:DNS_SERVERS="1.1.1.1"
npm run dev:dns
```

**Important:** this is a local workaround, not part of the app. It is never loaded
by `npm start`, `npm run dev`, the seed script or the tests, and no hostnames or
IP addresses are hardcoded anywhere in the project. In production (Render,
Railway, Fly.io, a VPS, Azure App Service…) the platform resolver handles SRV
records and you start the API normally with `npm start`.

Some routers/VPNs also block outbound DNS to public resolvers; if `dev:dns` does
not help, try disconnecting the VPN, or use a local MongoDB (`npm run db:memory`)
to confirm the rest of the app works.

### "Cannot read properties of undefined (reading 'name')" on sign-in

Fixed in this build. The UI used to dereference `user.name` after login without
checking that the API had returned a user profile, so a 200 response with an
unexpected body crashed the page.

Now the response is validated in `Client/src/services/authPayload.js` before
anything is stored, and every caller handles a missing profile with a readable
message. Covered by `Client/tests/authPayload.test.js` (8 tests) and
`Server/tests/login-contract.test.js` (9 tests), plus a browser check that fakes
a 200-without-user response and confirms no exception is thrown.

If you still see it, you are running an older copy of `Client/` — extract the ZIP
again and delete `Client/node_modules`, `Client/dist` before `npm install`.

---

## 14. Project structure

```text
StaffSync/
├─ README.md                  ← you are here
├─ docs/screenshots/          product screenshots used above
├─ Client/                    React + Vite front end
│  ├─ .env.example
│  ├─ README.md
│  ├─ index.html
│  ├─ package.json           scripts: dev, build, preview, test
│  ├─ tests/                 authPayload.test.js (login response contract)
│  ├─ vite.config.js          dev server + /api proxy
│  └─ src/
│     ├─ auth/                LoginPage, RegisterPage
│     ├─ components/          ui, layout, dashboard, employees, leaves, …
│     ├─ context/             AuthContext, DataContext, ToastContext
│     ├─ pages/               one file per route
│     ├─ services/            api.js → liveApi.js / mockApi.js + http.js
│     │                       authPayload.js validates the login response
│     ├─ styles/              16 plain-CSS files
│     ├─ utils/ · hooks/ · config/ · data/
│     ├─ App.jsx              routes + role guards
│     └─ main.jsx             providers, CSS entry point
└─ Server/
   ├─ .env.example
   ├─ package.json
   ├─ server.js               boot, DB connect, graceful shutdown
   ├─ seed/
   │  ├─ demoSeed.json        snapshot of the demo workspace
   │  ├─ seed.js              insert + re-date + hash passwords
   │  └─ run.js               CLI (npm run seed)
   ├─ scripts/
   │  ├─ memoryServer.mjs      npm run db:memory (throwaway MongoDB)
   │  ├─ doctor.mjs            npm run db:doctor (+ --fix-demo-passwords)
   │  ├─ verify-auth.mjs       npm run verify:auth
   │  ├─ dns-preload.mjs       optional DNS override (development only)
   │  └─ dns-override.mjs      npm run dev:dns
   ├─ src/
   │  ├─ app.js               Express app, CORS, helmet, routes
   │  ├─ config/              env validation, Mongo connection
   │  ├─ middleware/          auth, roles, validate, errors
   │  ├─ models/              User, Employee, LeaveRequest, Attendance,
   │  │                       Announcement, TrainingProgram, Notification,
   │  │                       Settings, Activity, RegistrationRequest
   │  ├─ controllers/         one per resource
   │  ├─ routes/              /api/* wiring
   │  ├─ validation/          Zod schemas
   │  └─ utils/               serializers, scope, dates, activity/notifications
   └─ tests/                  177 tests across 11 suites
```

The frontend never calls `fetch` directly from a component: services own the
HTTP layer, contexts own the state, pages render it.

---

## 15. Manual QA checklist

If you want to confirm everything by hand after setup:

1. **Auth** — sign in as HR. Refresh: still signed in. Sign out from the avatar menu.
2. **Registration** — sign out, *Create your account*, submit. Try to sign in:
   blocked with "awaiting HR approval". Sign in as HR → **Registrations** →
   approve → the new account can sign in.
3. **Directory** — HR → **Employees** → *Add employee* with a temporary password →
   sign in as that person.
4. **Leave** — as the employee, apply for leave; as the manager/HR, review →
   approve. The employee's balance drops by the number of days, and they get a
   notification.
5. **Attendance** — clock in (try WFH), clock out; reload: hours persist. A second
   clock-in is refused.
6. **Training** — employee enrolls, sets progress; manager (or HR) assigns a course;
   the assignee is notified.
7. **Announcements** — HR publishes one; everyone sees it and can mark it read.
8. **Permissions** — as an employee, paste `/employees` into the URL: you are
   redirected. As a manager, you only see your own team's leave and attendance.
9. **Errors** — stop the API and reload: the app tells you it can't reach the
   server instead of pretending it saved anything.

---

## 16. Known limitations

Honest list of what this build does **not** do:

- **No email delivery.** Notification preferences are saved, and in-app
  notifications work, but nothing is emailed. "Forgot password" explains this;
  HR can reset a password from the employee directory.
- **No token revocation.** Signing out clears the browser session; existing JWTs
  stay valid until they expire (`JWT_EXPIRES_IN`, 7 days by default). Changing a
  password does not invalidate other sessions. "Sign out other devices" is
  therefore disabled.
- **Manager scope is one level.** Managers see their direct reports; there is no
  nested org hierarchy or skip-level view.
- **Attendance is self-service.** There is no HR editing of someone else's record
  and no background job that marks absentees — "Absent" is derived from missing
  records in the UI.
- **Training is metadata.** No video hosting, quizzes or certificates.
- **Avatars are data URIs** stored in MongoDB (limited to ~1.5 MB per image by the
  API, and 2 MB per request).
- **Single workspace.** No multi-tenancy, organizations or SSO.
- **Analytics are computed in the browser** from the records the API returns.
  Fine for a company of this size; not for millions of rows.
- **Rate limiting is in-memory**, so it resets on restart and is per instance.
- **No Docker/CI files.** Setup is npm-based as described above.
- **Demo data is fictitious** (Nimbus Labs). Delete or replace it before real use.

---

Built with React, Vite, Express, MongoDB and a lot of plain CSS.
