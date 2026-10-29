# Infrastructure Guide: Production Docker Compose Multi-Service Architecture

## 1. Architectural Topology

The "Audit Trail: Event-Sourced Inventory & Logistics Ledger" is fully containerized across 7 dedicated microservices and observability engines orchestrated via an isolated bridge network (`audit-trail-net`):

```
+---------------------------------------------------------------------------------------------------+
|                                  DOCKER CONTAINER ORCHESTRATION                                  |
|                                                                                                   |
|     [ Public Traffic ]                                                                            |
|              |                                                                                    |
|              v                                                                                    |
|     +-------------------------+                                                                   |
|     |  audit-trail-frontend   |  (Port: 5173 / 80, Nginx 1.25 Alpine, Vite SPA Bundle)           |
|     +------------+------------+                                                                   |
|                  | (Reverse Proxy /api/ requests)                                                 |
|                  v                                                                                |
|     +-------------------------+                                                                   |
|     |     audit-trail-app     |  (Port: 3000, Node.js 20 Alpine, CQRS Command & Query Gateway)    |
|     +------------+------------+                                                                   |
|                  |                                                                                |
|                  +----------------------+-----------------------+                                 |
|                  |                      |                       |                                 |
|                  v                      v                       v                                 |
|     +-------------------------+  +--------------+  +--------------------------+                   |
|     |    audit-trail-mongo    |  |  audit-redis |  |   audit-trail-rabbitmq   |                   |
|     |  (MongoDB 7.0, 27017)   |  | (Redis 7.0)  |  | (RabbitMQ 3 Management)  |                   |
|     |  - Immutable EventStore |  | - CQRS Cache |  | - Port 5672 (AMQP)       |                   |
|     |  - Projected Read Models|  | - Rate Limits|  | - Port 15672 (Admin UI)  |                   |
|     +-------------------------+  +--------------+  +--------------------------+                   |
|                                                                                                   |
|  [ OBSERVABILITY ENGINES ]                                                                        |
|     [ app:3000/metrics ] ---> [ audit-trail-prometheus:9090 ] ---> [ audit-trail-grafana:3001 ]  |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Container Catalog & Port Allocation

| Container Name | Base Image | Host Port | Internal Port | Purpose | Volume Mount |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `audit-trail-frontend` | `nginx:alpine` | `5173` | `80` | Vite SPA + Nginx Reverse Proxy | None (Baked in) |
| `audit-trail-app` | `node:20-alpine` | `3000` | `3000` | Express CQRS API Gateway & Workers | None |
| `audit-trail-mongo` | `mongo:7.0` | `27017` | `27017` | Event Store & MongoDB Materialized Views | `mongo-data:/data/db` |
| `audit-trail-redis` | `redis:7-alpine` | `6379` | `6379` | Distributed Cache & Rate Limiter Store | `redis-data:/data` |
| `audit-trail-rabbitmq` | `rabbitmq:3-management-alpine` | `5672`, `15672`| `5672`, `15672`| Asynchronous Event Message Broker | `rabbitmq-data:/var/lib/rabbitmq` |
| `audit-trail-prometheus` | `prom/prometheus:v2.51.0` | `9090` | `9090` | Time-series Metrics Scraper (10s scrape) | Config bind mount |
| `audit-trail-grafana` | `grafana/grafana:10.4.0` | `3001` | `3000` | Production Observability Dashboards | `grafana-data:/var/lib/grafana` |

---

## 3. Environment Variables Configuration

The backend container reads configurations dynamically from `docker-compose.yml` or a `.env` file:

```env
# Application Settings
NODE_ENV=production
PORT=3000
JWT_SECRET=audit-trail-enterprise-secret-key-2026
CLIENT_URL=http://localhost:5173

# Database & Storage
MONGODB_URI=mongodb://mongo:27017/audit-trail-ledger
MONGO_MAX_POOL_SIZE=50
MONGO_WRITE_CONCERN=majority

# Distributed Caching
ENABLE_REDIS=true
REDIS_HOST=redis
REDIS_PORT=6379

# Event Streaming & Messaging
ENABLE_RABBITMQ=true
RABBITMQ_URL=amqp://rabbitmq:5672
```

---

## 4. Operational Runbook: Commands & Management

### 1. Launching the Entire Infrastructure
To boot all 7 microservices in detached mode with automated health dependency checks:
```bash
docker compose up -d
```

### 2. Validating Container Health States
Inspect container health conditions (`healthy` status indicates completed warm-ups):
```bash
docker compose ps
```

### 3. Live Stream Logs
Tail logs for the core backend microservice:
```bash
docker compose logs -f app
```

Tail logs across all containers:
```bash
docker compose logs -f --tail=100
```

### 4. Interactive UIs & Verification Endpoints
Once booted, access the following operational consoles:
- 💻 **React UI Dashboard**: [http://localhost:5173](http://localhost:5173)
- 📖 **Swagger OpenAPI Documentation**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- 🐰 **RabbitMQ Management Dashboard**: [http://localhost:15672](http://localhost:15672) (User: `guest` / Pass: `guest`)
- 📈 **Prometheus Telemetry Scraper**: [http://localhost:9090](http://localhost:9090)
- 📊 **Grafana Observability Dashboard**: [http://localhost:3001](http://localhost:3001) (User: `admin` / Pass: `admin`)
- 🩺 **Backend Liveness Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### 5. Graceful Teardown & Persistence
Stop containers while **preserving database and cache data**:
```bash
docker compose down
```

Stop containers and **purge all volume storage** (Clean Slate Reset):
```bash
docker compose down -v
```

---

## 5. Backup & Disaster Recovery Runbook

### MongoDB Event Store Snapshot
```bash
docker compose exec mongo mongodump --db=audit-trail-ledger --out=/data/db/backup_$(date +%Y%m%d)
```

### Redis Cache Dump
```bash
docker compose exec redis redis-cli BGSAVE
```
