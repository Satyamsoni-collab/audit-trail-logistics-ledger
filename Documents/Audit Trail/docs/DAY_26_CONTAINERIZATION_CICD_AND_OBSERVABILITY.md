# Day 26: Production Containerization, CI/CD Pipeline Automation, and Observability (Prometheus & Grafana)

## 1. Architectural Overview

Day 26 prepares the "Audit Trail: Event-Sourced Inventory & Logistics Ledger" for high-availability enterprise deployment using cloud-native microservices patterns, continuous integration & delivery, and deep observability:

```
+---------------------------------------------------------------------------------------------------+
|                                  DOCKER ORCHESTRATED PRODUCTION STACK                              |
|                                                                                                   |
|  +------------------------------+             +-------------------------------+                   |
|  |       audit-trail-frontend   |             |       audit-trail-app         |                   |
|  |     (React Vite + Nginx)     | --(Proxy)-> |   (Node.js/Express Backend)   |                   |
|  |         Port: 5173/80        |             |          Port: 3000           |                   |
|  +------------------------------+             +---------------+---------------+                   |
|                                                               |                                   |
|                      +------------------------+---------------+-----------------------+           |
|                      |                        |                                       |           |
|                      v                        v                                       v           |
|            +------------------+     +--------------------+                 +--------------------+ |
|            | audit-trail-mongo|     | audit-trail-redis  |                 |audit-trail-rabbitmq| |
|            |   (MongoDB 7.0)  |     |   (Redis 7 Cache)  |                 | (RabbitMQ Broker)  | |
|            |    Port: 27017   |     |     Port: 6379     |                 |  Port: 5672/15672  | |
|            +------------------+     +--------------------+                 +--------------------+ |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |                                OBSERVABILITY TELEMETRY STACK                                |  |
|  |                                                                                             |  |
|  |       [ app:3000/metrics ] ---> [ Prometheus (Port 9090) ] ---> [ Grafana (Port 3001) ]     |  |
|  |                                 (Scrapes every 10s)             (Auto-Provisioned Dashboards)|  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Key Components Delivered

### 1. Multi-Stage Containerization (Docker)
- **Backend `Dockerfile`**:
  - Multi-stage build (`node:20-alpine`).
  - Stage 1: Cleans dependencies and extracts isolated production packages (`prod_node_modules`).
  - Stage 2: Minimal runtime image running as unprivileged non-root user `node`.
  - Built-in container health check: `curl -f http://localhost:3000/api/health`.
- **Frontend `frontend/Dockerfile`**:
  - Stage 1: Builds React 18 / Vite 5 production bundle.
  - Stage 2: Serves static assets via high-performance `nginx:alpine`.
  - Includes custom `frontend/nginx.conf` with:
    - SPA client-side routing (`try_files $uri /index.html`).
    - Nginx reverse-proxy to backend (`http://app:3000/api/`).
    - Zero-buffering configuration for Server-Sent Events (`proxy_buffering off;`).
- **Orchestration (`docker-compose.yml`)**:
  - Full-stack coordination: Backend App, Frontend UI, MongoDB, Redis, RabbitMQ, Prometheus, and Grafana.
  - Declarative health checks, named volume persistence, and isolated bridge network (`audit-trail-net`).

### 2. CI/CD Pipeline Automation (GitHub Actions)
- **`.github/workflows/deploy.yml`**:
  - **Job 1 (`test`)**: Spins up live MongoDB 7.0 and Redis 7 service containers in the runner; executes full Jest unit and integration test suites; builds the Vite frontend bundle.
  - **Job 2 (`build-and-push-docker`)**: Triggers on push to `main`; sets up Docker Buildx; authenticates to GitHub Container Registry (`ghcr.io`); builds and publishes multi-architecture images for backend and frontend tagged with `:latest` and `:sha`.
  - **Job 3 (`smoke-test`)**: Validates Docker Compose orchestration syntax and configuration integrity.

### 3. Production Observability (Prometheus & Grafana)
- **Prometheus (`deploy/prometheus/prometheus.yml`)**:
  - Continuous 10s scraping of backend `/metrics`.
- **Grafana Provisioning (`deploy/grafana/`)**:
  - Auto-configured Prometheus datasource (`http://prometheus:9090`).
  - Auto-provisioned dashboard: `audit-trail-overview.json`.
  - Panels:
    1. **Circuit Breaker Status**: Gauges state transitions (`CLOSED`, `HALF_OPEN`, `OPEN`).
    2. **Throughput (eps / qps)**: Rates of commands appended and read queries answered.
    3. **HTTP Latency**: Real-time response time curves.
    4. **Projection Sync Lag (ms)**: Event sourcing replay and read-model synchronization latency.
    5. **Redis Cache Ratio**: Hit/Miss efficiency ratio.
    6. **Active SSE Stream Subscribers**: Live client count monitoring.

---

## 3. Quickstart: Running the Distributed Stack

```bash
# 1. Start all 7 services in detached mode
docker compose up -d --build

# 2. Verify all containers are healthy
docker compose ps

# 3. Access Service Endpoints:
# - Frontend Application:  http://localhost:5173
# - Backend API:           http://localhost:3000/api/health
# - Prometheus UI:         http://localhost:9090
# - Grafana Dashboards:    http://localhost:3001 (User: admin / Pass: admin)
# - RabbitMQ Management:   http://localhost:15672 (User: guest / Pass: guest)
```
