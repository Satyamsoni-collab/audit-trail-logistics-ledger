# 🌐 Day 20: Global Multi-Region Deployment & Cross-Region Database Replication

This document defines the Enterprise Architecture blueprint for deploying the **Audit Trail: Event-Sourced Inventory & Logistics Ledger** globally across multiple geographical cloud regions.

---

## 1. Global Multi-Region Deployment Topology

To support worldwide logistics hubs (North America, Europe, Asia-Pacific) with sub-second response times and 99.999% availability, the system transitions from a single cluster to a **Global Multi-Region Distributed Deployment**.

```text
                                  ┌────────────────────────┐
                                  │   GLOBAL GEO-DNS / CDN │
                                  │  (AWS Route 53 / CF)   │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      │ Latency-based Routing │ Geo-Routing           │
                      ▼                       ▼                       ▼
            ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
            │   REGION 1 (US)   │   │   REGION 2 (EU)   │   │  REGION 3 (APAC)  │
            │  [PRIMARY WRITE]  │   │    [READ EDGE]    │   │    [READ EDGE]    │
            ├───────────────────┤   ├───────────────────┤   ├───────────────────┤
            │ • API Gateway     │   │ • API Gateway     │   │ • API Gateway     │
            │ • Command Svcs    │   │ • Query Svcs      │   │ • Query Svcs      │
            │ • Query Svcs      │   │ • Edge Redis Cache│   │ • Edge Redis Cache│
            │ • Local Redis     │   │ • Read Projectors │   │ • Read Projectors │
            └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
                      │                       │                       │
                      └───────────────────────┼───────────────────────┘
                                              │
                                 ┌────────────┴────────────┐
                                 │   GLOBAL MONGODB ATLAS  │
                                 │  MULTI-REGION REPLICA   │
                                 │ (5 Nodes across 3 Geos) │
                                 └─────────────────────────┘
```

### A. Traffic Ingress & Geo-Routing
1. **Geo-DNS Routing (Anycast / Route 53)**: Client requests hit the nearest edge point of presence.
2. **Path-Based Service Routing**:
   - **Write Commands (`/api/commands/*`)**: Directed to the designated **Primary Write Region** (`us-east-1`) to avoid cross-region distributed lock contention.
   - **Read Queries (`/api/queries/*`, `/api/v1/*`)**: Terminated in the local region, querying localized Redis read replicas and localized MongoDB secondary projections for ultra-low latency ($< 15\text{ms}$).

### B. Regional Node.js Containers & Orchestration
- Deployed via **Kubernetes (EKS / GKE)** or **AWS ECS Fargate** with Horizontal Pod Autoscalers (HPA) scaling on CPU $> 70\%$ or request volume $> 1000\text{ RPS}$.
- Local Redis caching instances deployed in each regional VPC with automatic cache invalidation via cross-region event relays.

---

## 2. Cross-Region Database Replication & Failover

In an Event-Sourced architecture, the `EventStore` is the **single source of truth**. Data loss in the event store is fatal.

### A. Distributed MongoDB Replica Set Topology (5-Node Quorum)
To prevent network partition split-brain anomalies:
- **Node 1 (US)**: Primary (Electable, Priority 7)
- **Node 2 (US)**: Secondary (Electable, Priority 5)
- **Node 3 (EU)**: Secondary (Electable, Priority 3)
- **Node 4 (EU)**: Secondary (Electable, Priority 3)
- **Node 5 (APAC)**: Voter / Arbiter (Ties breaker, zero data storage)

### B. Consistency & Durability Matrix (RPO = 0, RTO < 30s)

| Operation Type | Write Concern | Read Concern | Read Preference | Architectural Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Command Append (`EventStore`)** | `w: "majority"`, `j: true` | `majority` | `primary` | **Zero Data Loss Guarantee**. An event must be written to disk journal and confirmed across the majority of global nodes before 202 Accepted is emitted. |
| **Query Materialized Views (`InventoryItem`)** | `w: 1` | `local` | `nearest` | **Ultra-Low Latency**. Served from the geographically closest secondary node or local Redis cache. |
| **Forensic Audit / State Replay** | `w: "majority"` | `linearizable` | `primaryPreferred` | **Absolute Consistency**. Guarantees state replay is not affected by replication lag. |

### C. Automated Cross-Region Failover Sequence
If the primary region (`us-east-1`) suffers an unexpected catastrophic cloud outage:
1. **Heartbeat Failure Detection (5-10s)**: Secondary nodes in Europe detect loss of primary heartbeats.
2. **Quorum Election (10-15s)**: Nodes 3, 4, and 5 form an absolute majority (3/5 votes) and elect Node 3 (EU) as the new global primary.
3. **Traffic Rerouting (5s)**: Global Route 53 health-checks fail over write DNS records to the EU gateway.
4. **Total Recovery Time**: **RTO < 30 seconds, RPO = 0** (no committed events are rolled back due to `w: "majority"`).

---

## 3. Replication Lag Mitigation & Change Stream Relays
- **VPC Peering & AWS Transit Gateway**: Dedicated private interconnects between AWS regions keep cross-region replication latency under $45\text{ms}$.
- **CDC Change Stream Relays**: MongoDB Change Streams in secondary regions continuously listen to the replicated oplog and update local Redis read caches immediately upon event arrival.
