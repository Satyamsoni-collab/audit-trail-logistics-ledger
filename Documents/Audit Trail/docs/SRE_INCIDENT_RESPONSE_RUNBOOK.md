# SRE Incident Response Runbook: Autonomous Mitigation & Disaster Recovery

## 1. Incident Severity Classification

| Severity | Definition | Response SLA | Target Resolution |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Core ledger write pipeline unavailable (Circuit Breaker OPEN across all replicas), data loss risk. | `< 5 mins` | `< 30 mins` |
| **SEV-2 (High)** | Redis cache outage causing severe database read degradation, query latency `p99 > 500ms`. | `< 15 mins` | `< 2 hours` |
| **SEV-3 (Moderate)**| Anomaly alert spikes, isolated non-blocking projection delays. | `< 1 hour` | Next business sprint |

---

## 2. Incident Scenario A: Circuit Breaker State Goes "OPEN"

### 1. Alert Description & Symptoms
- **Prometheus Alert**: `CircuitBreakerTripped` / `AuditTrailCommandCircuitOpen`
- **User Impact**: Inbound CQRS command write requests (`POST /api/commands/*`) are immediately short-circuited with:
  ```json
  {
    "status": "error",
    "code": "CIRCUIT_BREAKER_OPEN",
    "message": "Service Temporarily Unavailable: Circuit breaker tripped by Autonomous Remediation Agent."
  }
  ```
- **Read Query Impact**: None. CQRS read queries (`/api/queries/*`) remain online and serve cached data.

### 2. Immediate Diagnostic Triage
1. **Check Prometheus Metric**:
   Query Prometheus for circuit state:
   ```promql
   circuit_breaker_state{state="open"} == 1
   ```
2. **Examine Backend Service Logs**:
   Filter for trip reasons and error signatures:
   ```bash
   # Docker Compose
   docker compose logs --tail=200 app | grep -E "CIRCUIT_BREAKER|AutonomousRemediation|MongoNetworkError"

   # Kubernetes
   kubectl logs -n audit-trail -l app=audit-trail-backend --tail=200 | grep -E "CIRCUIT_BREAKER|Remediation"
   ```
3. **Verify Downstream Subsystems**:
   - Check MongoDB replica set status:
     ```bash
     docker compose exec mongo mongosh --eval "rs.status()"
     ```
   - Check RabbitMQ message broker connections and unacknowledged queues:
     ```bash
     docker compose exec rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged
     ```

### 3. Mitigation & Recovery Steps
1. **Stabilize Downstream Service**:
   - If MongoDB connection exhaustion is identified, increase pool size in `.env` (`MONGO_MAX_POOL_SIZE=100`) and reload backend instances without downtime.
   - If RabbitMQ broker is overwhelmed, pause non-critical consumers or scale worker replicas.
2. **Initiate Canary Transition (`HALF_OPEN`)**:
   - The circuit breaker automatically tests recovery after `resetTimeout` (default 30 seconds).
   - If manual override is required, issue an authenticated admin probe command or invoke:
     ```bash
     curl -X POST http://localhost:3000/api/v1/compliance/circuit-breaker/reset \
       -H "Authorization: Bearer <CISO_ADMIN_JWT_TOKEN>"
     ```
3. **Verify Canary Health**:
   - Send single test command payload (`POST /api/commands/inventory`).
   - Monitor backend logs for:
     ```text
     🛡️ [CircuitBreaker] Canary transaction succeeded. Resetting state to CLOSED.
     ```
4. **Confirm Command Route Availability**:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health
   # Expected output: 200
   ```

---

## 3. Incident Scenario B: Redis Cache Misses Spike Drastically

### 1. Alert Description & Symptoms
- **Prometheus Alert**: `RedisCacheMissRatioHigh` (Cache hit ratio drops below 70% for > 5 mins)
- **Downstream Impact**: Sudden query volume surge on MongoDB read models; query latency elevates from `< 15ms` to `> 250ms`.

### 2. Immediate Diagnostic Triage
1. **Check Redis Connectivity**:
   ```bash
   # Test connectivity
   docker compose exec redis redis-cli ping
   # Expected response: PONG
   ```
2. **Inspect Memory Consumption & Evictions**:
   ```bash
   docker compose exec redis redis-cli info memory
   docker compose exec redis redis-cli info stats | grep -E "evicted_keys|keyspace_misses|keyspace_hits"
   ```
   - If `evicted_keys` is rapidly climbing, Redis has hit its `maxmemory` ceiling and is prematurely evicting read models.
3. **Inspect Application Cache Service Logs**:
   ```bash
   docker compose logs app | grep -E "\[CacheService\]|Redis"
   ```
   - Check if the backend dropped back to `[CacheService] Using in-memory fallback cache`.

### 3. Mitigation & Recovery Steps
1. **Prevent Cache Stampede (Thundering Herd)**:
   - Verify that `GetInventoryStockHandler` and `GetRealtimeAnalyticsHandler` apply read-through query deduplication to prevent database query swarming on cache misses.
2. **Expand Redis Memory Ceiling & Optimize Eviction Policy**:
   If memory exhaustion occurred, bump Redis memory dynamically without restart:
   ```bash
   docker compose exec redis redis-cli CONFIG SET maxmemory 2gb
   docker compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```
3. **Execute Read-Model Rehydration Script**:
   Repopulate critical query caches directly from the MongoDB materialization engine:
   ```bash
   docker compose exec app npm run rebuild-projections
   ```
4. **Validate Cache Hit Ratio Recovery**:
   Observe real-time metric recovery:
   ```promql
   rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
   ```
   - Confirm hit ratio returns to `>= 0.90` (90%+).

---

## 4. Post-Incident Review (PIR) Checklist

- [ ] Timeline of detection (Alert fired time vs triage time).
- [ ] Root cause analysis (Code defect, resource exhaustion, downstream broker delay, network partition).
- [ ] Effectiveness of automated remediation / circuit breaker.
- [ ] Corrective actions identified and tickets created in backlog.
