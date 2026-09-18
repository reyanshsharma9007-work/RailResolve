# Code_Quantum — RailResolve

Railway grievance redressal portal. Three processes: a React/Vite frontend, an
Express core backend, and a FastAPI processing service that runs the LLM
analysis.

## Architecture

```
Browser (React / Vite :5173)
        │  HTTP + Bearer JWT
        ▼
Express core backend :5000  ──────►  MongoDB
        │
        │  internal call, Bearer INTERNAL_SERVICE_TOKEN
        ▼
FastAPI processing service :8000  ──►  LLM provider
```

The frontend talks **only** to Express. FastAPI is an internal service: it is
called by Express (`source/services/aiProcessing.service.js`) and is never
reached directly from the browser. The AI analysis a passenger sees comes back
through `GET /api/complaints/:id`, not from FastAPI.

AI processing is fire-and-forget. If the LLM is slow or unavailable the
complaint is still created successfully; the analysis is simply recorded as
`PENDING` or `FAILED` and the UI says so.

## Local development — start in this order

1. **MongoDB** — must be running and reachable at `MONGODB_URI`.

2. **Seed reference data** (first run only, idempotent). Without this there are
   no trains, stations or departments, so no journey or complaint can be filed.
   ```bash
   cd backend/railresolve-express-backend
   cp .env.example .env      # then edit
   npm install
   npm run seed
   ```

3. **Express backend → :5000**
   ```bash
   cd backend/railresolve-express-backend
   npm run dev
   ```
   Health check: `curl http://localhost:5000/health`

4. **FastAPI service → :8000**
   ```bash
   cd backend/railresolve-fastapi-backend
   cp .env.example .env      # then edit — LLM key and INTERNAL_SERVICE_TOKEN
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
   `INTERNAL_SERVICE_TOKEN` must match the value in the Express `.env`.

5. **Frontend → :5173**
   ```bash
   cp .env.example .env
   npm install
   npm run dev
   ```

Open http://localhost:5173.

### Ports and CORS

Vite is pinned to **5173** in `vite.config.js` because Express allows exactly one
origin (`CLIENT_ORIGIN`, default `http://localhost:5173`). If you change one,
change the other or every request fails CORS preflight.

### Secrets

The frontend `.env` holds only `VITE_API_BASE_URL`. Everything prefixed `VITE_`
is compiled into the public bundle, so LLM keys, `INTERNAL_SERVICE_TOKEN`,
`JWT_SECRET` and database credentials must stay in the backend `.env` files.

## Passenger flow

Register → Login → Dashboard → **Add Journey** → Report Grievance (pick journey,
department, category) → Submit → reference number → attach evidence → Track →
comment → confirm resolution and rate → Closed.

A journey is required before a grievance can be filed: complaints are always
linked to a journey the passenger owns. New accounts start with none, so the
dashboard and the Report Grievance page both offer **Add Journey**.

## Admin flow

Login → Dashboard queue → filter/search → open a complaint → view AI analysis →
assign an officer / change status / escalate → comment.

The status dropdown only offers transitions the backend state machine permits
from the complaint's current status, and hides actions the signed-in role is not
authorised to perform (resolution is the assigned officer's action, closure is
the passenger's).
