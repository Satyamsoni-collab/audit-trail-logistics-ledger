# 🌐 Day 23: Enterprise Message Broker (RabbitMQ), Distributed Tracing & Circuit Breaker Architecture

This document details the Cloud-Native Event-Driven Microservices enhancements implemented on Day 23 for the **Audit Trail: Event-Sourced Inventory & Logistics Ledger**.

---

## 1. Enterprise Message Broker Architecture (RabbitMQ/AMQP)

To transition from an in-process monolithic event bus to a distributed microservices ecosystem, event dissemination is decoupled using **RabbitMQ** (`src/events/brokers/MessageBroker.js`).

```text
┌─────────────────┐       ┌──────────────────────┐
│  Write Command  │ ───►  │  EventStore (Append) │
└─────────────────┘       └──────────┬───────────┘
                                     │ Event Published
                                     ▼
                          ┌──────────────────────┐
                          │ Enterprise Message   │
                          │ Broker (RabbitMQ)    │
                          │ Exchange: Topic      │
                          └──────────┬───────────┘
                 ┌───────────────────┴───────────────────┐
                 │ (inventory.*)                         │ (Unprocessable Error)
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │ Projector Consumer Queue│             │ Dead-Letter Queue (DLQ) │
    │ (Manual Acknowledgment) │             │ (audit_trail_events_dlq)│
    └─────────────────────────┘             └─────────────────────────┘
```

### A. Reliability & At-Least-Once Delivery Guarantees
- **Topic Exchange (`audit_trail_events`)**: Dispatches domain events using routing keys (`inventory.item_created`, `inventory.stock_added`, `inventory.stock_removed`).
- **Publisher Confirms**: Commands await confirmation from RabbitMQ that the message has been durably persisted to disk (`persistent: true`).
- **Manual Consumer Acks**: Projectors acknowledge messages (`channel.ack(msg)`) only after successfully committing changes to MongoDB read models.
- **Dead-Letter Exchange (DLQ)**: If a poison event fails repeated processing, it is rejected without requeue (`channel.nack(msg, false, false)`), automatically transferring it to the isolated `audit_trail_events_dlq` for operator inspection without stalling downstream consumers.
- **Zero-Crash Standalone Fallback**: If RabbitMQ is offline or during offline unit testing, the broker automatically falls back to an in-memory event bus.

---

## 2. Distributed Tracing & Observability (OpenTelemetry)

Distributed tracing connects asynchronous operations across process and network boundaries using **W3C TraceContext** standards.

### A. Context Propagation Across Broker Headers
When an event is published:
1. The publisher injects the `traceparent` (`00-{traceId}-{spanId}-01`) into the AMQP message headers.
2. The consumer / projector extracts the trace context upon receiving the delivery.
3. Operations are recorded inside an OpenTelemetry child span (`Projector:{eventType}`):

```text
HTTP Ingress Span (traceId: e9f1.. spanId: 001)
 └── Command Handler Span (spanId: 002)
      └── EventStore Save Span (spanId: 003)
           └── RabbitMQ Publish Span (spanId: 004)
                ══════════ AMQP Header Network Hop ══════════
                └── Projector Consumer Span (spanId: 005)
                     └── MongoDB Materialized View Update (spanId: 006)
```

---

## 3. Circuit Breaker & Resilience Pattern (Opossum Integration)

To prevent catastrophic cascading outages when downstream dependencies (MongoDB, RabbitMQ, external logistics APIs) experience latency spikes, critical pipelines are protected by **Circuit Breakers** (`src/utils/circuitBreaker.js`).

### A. Circuit Breaker Configuration
- **Library**: `opossum` with native state machine fallback.
- **Timeout**: `3000ms` (requests taking longer than 3 seconds are aborted).
- **Error Threshold**: `50%` (if more than 50% of requests fail within a 10s window, the circuit trips to `OPEN`).
- **Reset Timeout**: `30000ms` (cooldown window before probing recovery in `HALF_OPEN` state).

### B. States & Lifecycle

| State | Behavior |
| :--- | :--- |
| **`CLOSED`** | Normal operation. All calls pass through to the protected dependency. |
| **`OPEN`** | The dependency is failing. Calls are immediately fast-failed with `E_CIRCUIT_OPEN` (or return fallback) without consuming thread pool resources. |
| **`HALF_OPEN`**| Cooldown elapsed. The breaker allows a trial request to probe if the downstream service has recovered. |

---

## 4. Docker Compose Multi-Service Orchestration

The `docker-compose.yml` file now orchestrates:
1. **Node.js CQRS Ledger App** (Port 3000)
2. **MongoDB 6.0** (Port 27017)
3. **Redis 7-Alpine Distributed Cache** (Port 6379)
4. **RabbitMQ 3-Management-Alpine Message Broker** (AMQP: 5672, Management UI: 15672)

To start the complete multi-service stack:
```bash
docker compose up -d
```
Access the RabbitMQ Management UI at `http://localhost:15672` (default user: `guest`, pass: `guest`).
