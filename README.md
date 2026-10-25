# RailResolve

RailResolve is a React + Express + MongoDB + FastAPI railway grievance platform.

## Architecture

`React -> Express -> MongoDB` and `Express -> FastAPI AI service`.

The existing authentication, journey, complaint lifecycle, evidence, assignment, officer resolution, notifications, Docker, Kubernetes and CI/CD structure is preserved.

## AI capabilities

The application now exposes six product capabilities without pretending missing datasets exist:
1. Complaint classification — rule based with human-review escalation.
2. Priority prediction — server-side safety rules plus guarded AI recommendation.
3. Duplicate detection — token-similarity against the passenger's authorized prior complaints.
4. Complaint summarization — extractive operational summary.
5. AI Assistant — grounded application knowledge and authorized personal context.
6. Ticket scanner — OCR + field extraction with mandatory user confirmation; railway-ticket training is DATA_PENDING.

See `docs/AI_STATUS.md` and the other `docs/AI_*.md` files.

## Local development

### Frontend
```bash
npm ci
npm run lint
npm run build
npm run dev
```

### Express
```bash
cd RailResolve/railresolve-express-backend
npm ci
cp .env.example .env
npm run seed
npm test
npm run dev
```

### FastAPI
```bash
cd RailResolve/railresolve-fastapi-backend
python -m venv .venv
# activate the venv
pip install -r requirements.txt
cp .env.example .env
python -m compileall app
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Set the same `INTERNAL_SERVICE_TOKEN` in Express and FastAPI.

## AI routes

Through Express:
- `POST /api/ai/analyze-preview` (passenger auth)
- `POST /api/ai/assistant` (passenger auth)
- `POST /api/ai/ticket-scan` (passenger auth)

Internal FastAPI:
- `POST /internal/ai/analyze`
- `POST /internal/ai/assistant`
- `POST /internal/ai/ticket-scan`

## Docker

```bash
docker build -t railresolve-frontend .
docker build -t railresolve-express ./RailResolve/railresolve-express-backend
docker build -t railresolve-fastapi ./RailResolve/railresolve-fastapi-backend
```

## Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
# Create railresolve-secret from real deployment secrets.
kubectl apply -f k8s/
kubectl get pods -n railresolve
```

The intended ingress host is `railresolve.local`.

## CI/CD

`.github/workflows/ci.yml` runs frontend lint/build, Express tests, and FastAPI compilation.

`.github/workflows/cd.yml` builds/pushes the three GHCR images and deploys to the Windows self-hosted runner's Docker Desktop Kubernetes context. Configure the required GitHub secrets before enabling deployment.

## Data

The uploaded project ZIP did not contain the promised ML dataset ZIP. No fake dataset, metrics, or model training result was created. See `docs/AI_DATASET_AUDIT.md`.

## Current environment limitation

At implementation time, `docker` and `kubectl` were unavailable. Node/npm were available, but bundled npm executables returned `Permission denied`; FastAPI syntax compilation succeeded.


## AI implementation status

The current AI layer is intentionally CPU-friendly and provider-based. No datasets were added and no fake ML models or metrics are claimed. See `docs/AI_STATUS.md` for the authoritative feature matrix.

Duplicate detection is `RULE_BASED_BASELINE` (token Jaccard), the assistant is `RULE_BASED / RAG_READY`, and ticket ML training is `DATA_PENDING`. Final complaint priority is enforced server-side; passenger-submitted priority cannot shorten the SLA.



## AI current state
RailResolve currently has 6 AI capabilities implemented as rule-based/OCR baselines. **0 trained ML models** are included because no datasets were supplied. No fabricated training metrics are claimed.
