# LeadFlow CRM - Client Lead Management System

A small CRM for agencies, freelancers and startups. When someone fills in the contact form on your website, the
lead lands in a secure admin dashboard where you can track its status, log follow-up notes and calls, schedule
reminders and see which leads become clients.

**Stack:** React + Vite + Tailwind (frontend), Node.js + Express (API), MongoDB + Mongoose (database),
JWT + bcrypt (admin login).

## Features

| Requirement | What it does |
| --- | --- |
| Lead listing | Table with name, email, company, source, status, owner and time received; search, filters, pagination, Kanban board |
| Status updates | `new -> contacted -> proposal -> converted` (or `lost`); change it in the table, drawer or by dragging cards |
| Notes and follow-ups | Log calls, emails, meetings and internal notes; every action is timestamped in the lead's timeline; schedule dated follow-up reminders and tick them off |
| Secure admin access | Login with email and password. Every lead/task/user API route requires a signed token; passwords are bcrypt-hashed |
| Website form ingestion | Public `POST /api/contact-inbound` endpoint with validation, spam trap and rate limiting |
| Search and filter | Header search, status tabs, source filter, assignee filter |
| Timestamps | Received time, first-contact time, converted time, and a timestamp on every note/stage change |
| Analytics | Totals, conversion and win rate, revenue won, average response time and SLA, funnel, per-source and per-person performance, leads per day. All calculated from your real data |
| Extras | CSV export, automatic follow-up task for each new lead, round-robin assignment, new-lead notifications, auto-refresh every 30 seconds |

## Setup

You need **Node.js 20+** and a **MongoDB** database (local install, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
git clone <your-repo-url>
cd leadflow-crm
npm install
cp .env.example .env      # on Windows: copy .env.example .env
```

Open `.env` and fill in:

- `MONGODB_URI` - your connection string (default points to a local MongoDB)
- `JWT_SECRET` - a long random string. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` - your admin login. Quote passwords in `.env` if they contain spaces. On startup, the configured admin account is created or its password is synchronized to `ADMIN_PASSWORD`.

Then:

```bash
npm run dev               # http://localhost:3000
```

Sign in with the admin email and password you put in `.env`.

**Optional demo data** (so the dashboard is not empty): `npm run seed`
(use `npm run seed -- --reset` to wipe leads and reseed).

**Try the website-form flow:** open `http://localhost:3000/contact-demo.html`, submit the form, then look at *All Leads*
in the dashboard. The lead appears within about 30 seconds (or instantly on refresh).

### Production

```bash
npm run build
npm start                 # serves the built app and the API on PORT
```

Set `NODE_ENV=production` (or just use `npm start`), a strong `JWT_SECRET`, `TRUST_PROXY=true` if you are behind a proxy
such as Render or Railway, and `ALLOWED_ORIGINS` to your real website, e.g. `https://www.mybusiness.com`.

### Other commands

| Command | Purpose |
| --- | --- |
| `npm test` | Unit tests for validation, stats and CSV logic |
| `npm run create-admin -- you@example.com "new-password" "Your Name"` | Add an admin or reset a password |
| `npm run lint` | TypeScript type check |

## Connect your own website form

Any form can post JSON to `POST /api/contact-inbound`. Required: `name`, `email`. Optional: `company`, `phone`, `message`,
`subject`, `source`, `budget` (for example `"$15,000 – $30,000"`, used to estimate the deal value), `timeline`.
A ready-to-paste snippet is in the app under **Settings**.

```js
fetch('https://your-crm.example.com/api/contact-inbound', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Jane Doe', email: 'jane@acme.com', message: 'Hi!' })
});
```

## API overview

| Method and path | Auth | Description |
| --- | --- | --- |
| `POST /api/contact-inbound` | public | Create a lead from a website form (rate limited, validated) |
| `POST /api/auth/login` | public | Returns a JWT (8h) |
| `GET /api/auth/me` | token | Current user |
| `GET /api/leads` | token | All leads |
| `POST /api/leads` | token | Add a lead manually |
| `PATCH /api/leads/:id` | token | Edit contact/deal fields (whitelisted) |
| `PATCH /api/leads/:id/status` | token | Change status |
| `POST /api/leads/:id/notes` | token | Log a call/email/meeting/note |
| `DELETE /api/leads/:id` | token | Delete a lead and its tasks |
| `GET/POST /api/tasks`, `PATCH /api/tasks/:id/toggle` | token | Follow-up reminders |
| `GET /api/users` | token | Team members (assignment dropdown) |
| `GET /api/health` | public | Health check |

## Project structure

```
server/            Express API
  index.ts           app setup, routes, Vite (dev) / static files (prod)
  routes/            auth, leads + tasks + users, public webhook
  models/            Mongoose models: Lead (with notes + activity), Task, User, Counter
  middleware/auth.ts JWT verification
  lib/               validation, rate limiter, serializers, lead creation
  seed.ts            optional demo data
src/               React app
  components/        dashboard views, drawer, modals, login, public form
  services/          api.ts (fetch + token), leadService.ts (API-backed cache)
  utils/             stats.ts (all analytics maths), time.ts
public/contact-demo.html   example website form
tests/             unit tests
```

## Security notes

- Passwords are stored as bcrypt hashes; login is rate limited (10 attempts / 15 min per IP + email) and does not reveal whether an email exists.
- The token is stored in `sessionStorage` (or `localStorage` if "Keep me signed in" is ticked). This is simple and common, but
  it means an XSS bug would expose it. React escapes output by default and no HTML is injected anywhere.
- The only unauthenticated write endpoint is the contact webhook. It can only create leads, limits body size, validates
  and caps every field, has a honeypot field and allows 10 submissions per hour per IP.
- CSV export neutralises spreadsheet formulas (`=`, `+`, `-`, `@`) coming from form input.
- Never commit `.env`. `.gitignore` already excludes it.

## Known limits (good next steps)

- Single admin role; all signed-in users see all leads. Add per-user permissions if you need them.
- Rate limiting is in memory (fine for one server instance; use Redis for several).
- No email notifications yet; new leads show in the dashboard bell and refresh every 30 seconds.
- Deal value is estimated from the budget the visitor selects; edit it as the deal firms up.
- Deploy link is this https://future-fs-02-eu84.onrender.com
