# AI Deployment

## Docker
Three application images are defined:
- `railresolve-frontend`
- `railresolve-express`
- `railresolve-fastapi`

FastAPI installs Tesseract in its image for image OCR. Raw datasets and model directories are excluded from production images.

## Kubernetes
Manifests use namespace `railresolve`, ClusterIP services for Express/FastAPI/Mongo, and an ingress routing `/api` to Express and `/` to the frontend.

Express and FastAPI consume `railresolve-secret`. Create it from deployment secrets; do not commit a populated Secret manifest.

## Local secret creation
Create `railresolve-secret` in namespace `railresolve` with at least `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, and `MONGODB_URI`. `CLIENT_ORIGIN` can also be supplied.

Docker/Kubernetes execution was not possible in the current environment because `docker` and `kubectl` are not installed.

Static Kubernetes review confirms namespace, Deployments, Services, ConfigMap, Secret references, Ingress, liveness/readiness probes, resource requests/limits, and Express→FastAPI service DNS configuration are defined. This is manifest inspection only; no cluster deployment was executed.
