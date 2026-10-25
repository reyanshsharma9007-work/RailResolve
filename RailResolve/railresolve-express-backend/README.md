# RailResolve — Express Core Business Backend

Part 1 of the RailResolve backend: the Node.js/Express **System of Record**.
Handles auth, RBAC, the complaint state machine, SLA/escalation, GridFS
evidence storage, audit logging, and admin analytics — everything except
the LLM/NLP processing microservice (FastAPI, built separately as Part 2).

## Stack
Node.js 18+, Express 4, MongoDB + Mongoose, GridFS (native driver),
JWT auth, bcrypt, multer, node-cron, winston.

## Folder structure

```
source/
  config/          env.js, constants.js (roles, departments, statuses, SLA targets)
  controllers/     one file per feature — HTTP layer only
  database/        database.js (Mongoose + GridFS connection), seed.js
  jobs/            sla.job.js — SLA breach scheduler (node-cron)
  middleware/      auth, rbac, ownership (IDOR), error, rate limiting, upload
  models/          one Mongoose schema per collection
  routers/         one file per feature, mounted in app.js
  services/        business logic (state machine, SLA calc, audit, notifications,
                    AI-processing client, attachment storage, analytics)
  utils/           logger, AppError, apiResponse, catchAsync, validators helper
  validators/      request payload validation per feature
  app.js           Express app assembly (middleware + routers)
  server.js        process entry point (connects DB, starts cron, listens)
```

Every feature (auth, journey, complaint, attachment, notification, admin,
reference-data) has its own controller + router + validator, kept
independent so any one file can be edited without touching the others.

## Setup

```bash
cp .env.example .env      # edit JWT_SECRET, INTERNAL_SERVICE_TOKEN, MONGODB_URI
npm install
npm run seed               # departments, trains, stations, SLA rules, 1 admin user
npm run dev                 # nodemon, http://localhost:5000
```

Seed creates an admin login: `admin@railresolve.local` / `ChangeMe123!`
(override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars) — change
this password immediately in any real deployment.

Officers and Senior Authorities are **not** self-registered. Register as a
PASSENGER via `/api/auth/register`, then have an ADMIN promote the account
via `PATCH /api/admin/users/:id/role`.

## API surface (all under `/api`)

- **auth**: register, login, me
- **journeys**: create/list/get (passenger-owned only)
- **complaints**: create, list (scoped by role), get detail, status update,
  assign, comment, escalate, resolve, close, attachments (upload/list)
- **attachments**: `/api/attachments/:id` — binary stream/download
- **notifications**: list, mark read, mark all read
- **admin**: users, role changes, audit logs, analytics, departments, SLA rules
- **reference**: trains, stations, departments (+ permitted categories) for
  frontend dropdowns

Every response follows `{ success, message, data }` on success or
`{ success: false, message, errorCode }` on error (see
`utils/apiResponse.js` and `middleware/error.middleware.js`).

## Security notes implemented

- JWT (HMAC-SHA256, 24h expiry), bcrypt (10 salt rounds)
- RBAC (`rbac.middleware.js`) + object-level authorization
  (`ownership.middleware.js`) — a passenger/officer can never read another
  user's complaint, verified by `loadComplaintWithAccessCheck`
- Strict server-side state machine (`config/constants.js` →
  `STATUS_TRANSITIONS`) — illegal jumps like `SUBMITTED → RESOLVED` are
  rejected with `400 INVALID_STATUS_TRANSITION`
- GridFS uploads: MIME allow-list (JPEG/PNG/PDF), 5MB image / 10MB document
  caps, UUID storage filenames (no path traversal, no original filename
  reuse)
- Rate limiting on `/auth/*`, complaint creation, and file uploads
- Every state-changing action writes an immutable `audit_logs` entry
  (no update/delete route exists for that collection)
- LLM integration (`services/aiProcessing.service.js`) is fully decoupled:
  it is called *after* the complaint-creation response is already sent,
  and any FastAPI failure/timeout only ever writes a `FAILED`
  `ComplaintAiAnalysis` record — it can never fail complaint creation

## What's intentionally NOT in this part

The FastAPI LLM processing microservice (`/internal/complaints/process`)
is a separate Python service per the PRD's dual-backend architecture. This
Express backend calls it via `FASTAPI_URL` + `INTERNAL_SERVICE_TOKEN` but
does not implement it — that's Part 2.
