# 🌐 Day 15: Distributed Event-Driven Architecture & Enterprise Scaling

This document serves as the Enterprise Blueprint for scaling the **Audit Trail: Event-Sourced Inventory & Logistics Ledger** from a modular monolith into a distributed, event-driven microservices ecosystem.

---

## 1. Distributed Event Streaming Integration

In our initial phases, the system utilized an in-process Node.js `EventEmitter` (`EventBus.js`). In a distributed microservices environment with multi-instance scaling, in-memory event buses cannot broadcast across separate servers or ensure guaranteed delivery if a node crashes.

### A. Architectural Options: Apache Kafka vs. Redis Streams

| Feature | In-Memory (Day 1-14) | Redis Streams | Apache Kafka |
| :--- | :--- | :--- | :--- |
| **Scope** | Single Node / Process | Distributed Cluster | Distributed Distributed Cluster |
| **Persistence** | None (Lost on crash) | Disk-backed (AOF/RDB) | Immutable Distributed Partition Log |
| **Consumer Groups** | None | Native Consumer Groups (`XREADGROUP`) | Partition Consumer Groups with Offset Commit |
| **Throughput** | In-process memory | 100k - 500k ops/sec | 1M+ ops/sec |
| **Use Case Fit** | Dev / Single Container | Lightweight Microservices & Caching | Enterprise Event Backbone / Global Ordering |

### B. The Transactional Outbox & Change Data Capture (CDC) Pattern
To guarantee **dual-write consistency** (writing to the MongoDB Event Store and publishing to Kafka/Redis without distributed 2-phase commits):

```text
┌─────────────────┐       ┌────────────────────────┐
│ Command Handler │ ───►  │   MongoDB EventStore   │  (Single Atomic Transaction)
└─────────────────┘       └───────────┬────────────┘
                                      │
                                      │ MongoDB Change Stream (oplog CDC)
                                      ▼
                          ┌────────────────────────┐
                          │   Outbox / CDC Relay   │
                          └───────────┬────────────┘
                                      │ Guaranteed at-least-once push
                                      ▼
                          ┌────────────────────────┐
                          │ Kafka / Redis Streams  │
                          └───────────┬────────────┘
                     ┌────────────────┴────────────────┐
                     ▼                                 ▼
         ┌───────────────────────┐         ┌───────────────────────┐
         │  Inventory Projector  │         │  Analytics Dashboard  │
         │     (Read Model)      │         │     (Real-Time)       │
         └───────────────────────┘         └───────────────────────┘
```

1. **Atomic Store Write**: The command writes the event to the `EventStore` inside MongoDB.
2. **Change Data Capture (CDC)**: A worker listens to MongoDB Change Streams (`watch()`).
3. **Stream Broadcast**: The worker streams events to Kafka topics or Redis Streams with retry and backpressure handling.

---

## 2. Microservices Domain Decomposition

We decompose the unified inventory system into three distinct **Bounded Contexts** following Domain-Driven Design (DDD):

```
┌────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY / KONG                             │
└──────────────┬─────────────────────────┬──────────────────────┬────────┘
               │                         │                      │
               ▼                         ▼                      ▼
┌─────────────────────────────┐ ┌──────────────────┐ ┌───────────────────┐
│ Inventory Management Svc    │ │ Audit &          │ │ Logistics         │
│ - Bounded Context: Stock    │ │ Compliance Svc   │ │ Tracking Svc      │
│ - Command Pipeline (Writes) │ │ - Event Store    │ │ - Shipments       │
│ - Stock Reservation Saga    │ │ - Replays        │ │ - Transit Updates │
│                             │ │ - Snapshots      │ │ - Geofence Events │
└──────────────┬──────────────┘ └────────┬─────────┘ └──────────┬────────┘
               │                         │                      │
               └────────────────► KAFKA  ◄──────────────────────┘
                              EVENT STREAM
```

### Bounded Contexts

1. **Inventory Management Service**:
   - Owns the core business rules around stock availability, SKUs, and items.
   - Emits events: `ItemCreated`, `StockAdded`, `StockReserved`, `StockReleased`.
2. **Audit & Compliance Service**:
   - Holds cold event storage, legal audit queries, state replay verification, and compliance snapshots.
   - Independent datastore optimized for archival and tamper-proof write-once, read-many (WORM) storage.
3. **Logistics Tracking Service**:
   - Coordinates shipments, dispatching, carrier assignments, and route legs.
   - Emits events: `ShipmentDispatched`, `ShipmentInTransit`, `ShipmentDelivered`.

### Distributed Consistency via Sagas (Stock Allocation Flow)
Distributed transactions are orchestrated via a **Choreographed Saga**:

1. **`OrderPlaced` Event** emitted by Orders Service.
2. **Inventory Service** consumes `OrderPlaced` -> Validates stock -> Appends `StockReserved` event.
3. **Logistics Service** consumes `StockReserved` -> Prepares dispatch -> Appends `ShipmentScheduled` event.
4. **Compensating Transaction**: If Logistics fails to dispatch, it emits `ShipmentFailed`. Inventory Service consumes `ShipmentFailed` and appends `StockReservationCompensated` to release stock automatically.

---

## 3. Real-Time Analytics & CQRS Materialized Views

To serve low-latency analytics dashboards (e.g., live warehouse heatmaps, real-time dispatch counters, out-of-stock velocity) without querying the operational read models:

### A. Reactive Projection Pipeline
- Instead of batch polling, consumers use **Reactive Projections**.
- Event projections are written directly to in-memory caches (Redis Hashes / Sorted Sets) for $O(1)$ and $O(\log N)$ dashboard retrieval.
- WebSocket or Server-Sent Events (SSE) push updates to client browsers immediately when projector updates complete.

### B. Materialized Views Breakdown

1. **Inventory Valuation View**:
   - Sum of stock multiplied by cost basis across all warehouses.
   - Updated incrementally upon every `StockAdded` or `StockRemoved` event.
2. **Velocity & Stockout Prediction View**:
   - Sliding window count (last 60 mins) of stock reduction rate.
   - Enables proactive replenishment alerts.
3. **Geographical Transit View**:
   - Aggregated items currently in transit across carriers and distribution hubs.
