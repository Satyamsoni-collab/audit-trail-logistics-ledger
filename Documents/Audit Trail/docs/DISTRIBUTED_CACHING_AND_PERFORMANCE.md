# ⚡ Day 19: Distributed Caching (Redis), Event-Driven Invalidation & Performance Profiling

This guide details the Day 19 performance optimizations implemented for the **Audit Trail: Event-Sourced Inventory & Logistics Ledger**.

---

## 1. Distributed Caching Layer Architecture (Redis)

In a CQRS architecture, read queries typically outnumber write commands by a factor of 10:1 or 100:1. Without caching, high-frequency query traffic exerts continuous read strain on MongoDB projections.

### A. Architectural Overview (`src/config/redis.js`)
- **Primary Cache Engine**: Utilizes **Redis** (`ioredis`) for distributed in-memory caching across multi-instance Node.js deployments.
- **Resilient Fallback**: If Redis is offline or undergoing maintenance, `CacheService` seamlessly drops down to an in-memory TTL cache without throwing 500 errors or interrupting API availability.
- **Cache Key Hierarchy**:
  - `cache:inventory:{aggregateId}`: Caches the materialized read model of an inventory item.
  - `cache:analytics:global`: Caches the global real-time logistics analytics view.

---

## 2. Query Pipeline Optimization & Event-Driven Invalidation

A classic problem with caching in event-driven systems is **stale reads** (e.g. stock changes from 100 to 50, but Redis still serves 100).

### A. Event-Driven Invalidation Pattern (Write-Invalidate)
Instead of relying strictly on time-to-live (TTL) expiry, the system implements **Event-Driven Cache Invalidation** within the CQRS Projectors:

```text
┌─────────────────┐       ┌──────────────────────┐
│  Write Command  │ ───►  │  EventStore (Append) │
└─────────────────┘       └──────────┬───────────┘
                                     │
                                     │ EventBus.emit()
                                     ▼
                          ┌──────────────────────┐
                          │  InventoryProjector  │
                          └──────────┬───────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │ MongoDB (Read Model DB) │             │  Redis Distributed Del  │
    │      item.save()        │             │  cacheService.del(key)  │
    └─────────────────────────┘             └─────────────────────────┘
```

1. **Write Command**: Client issues `POST /api/commands/inventory/:id/stock`.
2. **Event Appended**: Event store saves event and emits `STOCK_ADDED` / `STOCK_REMOVED`.
3. **Projector Materialization**: `InventoryProjector` updates the read model in MongoDB.
4. **Immediate Invalidation**: The projector immediately purges `cache:inventory:{aggregateId}` from Redis.
5. **Next Query**: The next `GET /api/queries/inventory/:id` experiences a sub-millisecond cache refresh from the updated MongoDB document and repopulates Redis.

---

## 3. Load Testing & Bottleneck Profiling

To prove that the CQRS event-sourcing pipeline can sustain high concurrent traffic, we provide both an automated Node.js profiler and a declarative Artillery benchmark.

### A. Running the Native Load Test Runner
Run directly from terminal without installing external tools:
```bash
npm run load-test
```

**Configurable Environment Options**:
```bash
CONCURRENCY=50 DURATION_SECONDS=20 TARGET_PORT=3000 npm run load-test
```

### B. Metrics Measured
- **Throughput**: Requests Per Second (RPS) sustained under peak load.
- **Latency Distribution**:
  - `p50` (Median Response Time)
  - `p95` (Tail latency affecting 95% of users)
  - `p99` (Extreme tail latency)
- **Cache Hit Ratio**: Percentage of queries served directly from Redis vs. MongoDB disk reads.
- **Error Rates**: Tracking HTTP 408 / 500 / connection drops.

### C. Declarative Artillery Benchmark
If Artillery is installed globally:
```bash
npx artillery run tests/performance/artillery-scenario.yml
```
