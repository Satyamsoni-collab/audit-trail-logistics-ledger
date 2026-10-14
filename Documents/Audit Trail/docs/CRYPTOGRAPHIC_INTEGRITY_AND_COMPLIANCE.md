# 🔐 Day 17: Cryptographic Event Hashing, Regulatory Audit Reports & Anomaly Detection

This document outlines the security architecture and regulatory compliance systems implemented on Day 17 for the **Audit Trail: Event-Sourced Inventory & Logistics Ledger**.

---

## 1. Cryptographic Event Hashing & Chain Integrity

To satisfy stringent regulatory standards (e.g., SOC 2 Type II, FDA 21 CFR Part 11, and ISO 27001), the event log cannot merely rely on database constraints. It must be **cryptographically tamper-evident**.

### A. Chained Hashing Mechanics (`EventStore.js` & `EventStoreService.js`)
Every new event appended to the `EventStore` is mathematically linked to its predecessor, creating an immutable Merkle Chain:

```text
┌─────────────────────────┐         ┌─────────────────────────┐
│         Event 1         │         │         Event 2         │
│  Version: 1             │         │  Version: 2             │
│  PreviousHash: GENESIS  │ ◄────── │  PreviousHash: Hash(E1) │
│  Hash: 3a7f...          │         │  Hash: 9b2d...          │
└─────────────────────────┘         └─────────────────────────┘
```

- **Hash Computation**:
  $$\text{Hash}_i = \text{SHA256}(\text{Hash}_{i-1} \parallel \text{AggregateId} \parallel \text{Version} \parallel \text{EventType} \parallel \text{PayloadJSON} \parallel \text{TimestampISO})$$
- **Verification Endpoint**:
  `GET /api/v1/compliance/verify-chain/:aggregateId`
  Reconstructs and verifies every link from `GENESIS` to the current tip. If a single byte in an event payload or version was tampered with directly in MongoDB, the verification immediately fails with an exact violation report.

---

## 2. Compliance & Regulatory Audit Report Generator

Regulators require verifiable, exportable records of inventory movements, authorized actors, and chronological ledger updates.

### A. Report Generation Engine (`ComplianceReportService.js`)
- **API Endpoints**:
  - **JSON Format**: `GET /api/v1/compliance/report/:aggregateId`
  - **CSV Export**: `GET /api/v1/compliance/report/:aggregateId?format=csv`
- **Report Contents**:
  1. **Executive Metadata**: Unique Report ID, compliance standard, and cryptographic chain audit status (`PASSED_TAMPER_PROOF`).
  2. **Aggregate Ledger Summary**: Current version, total events, cumulative stock added/removed, and current physical stock.
  3. **Actor Activity Breakdown**: Summary of all distinct actors (users, systems) and count of operations performed.
  4. **Full Movement Ledger**: Chronological event logs with hashes, timestamps, and quantities.
  5. **Security Audit Log**: Any anomalous events or policy alerts flagged on the aggregate.

---

## 3. Real-Time Anomaly Detection Engine

Rather than passive post-incident audits, the system actively monitors the live event stream to intercept and alert on suspicious activity.

### A. Monitoring Rules (`AnomalyDetectionEngine.js`)
Subscribed directly to the internal `EventBus`, the engine evaluates every event in real time:

| Rule Code | Severity | Trigger Condition |
| :--- | :--- | :--- |
| **`ABNORMAL_STOCK_SPIKE`** | `HIGH` | Single event adjustment $\ge 500$ units. |
| **`SUSPICIOUS_DRAIN`** | `HIGH` | Single event depletion $\le -250$ units. |
| **`UNAUTHORIZED_ANONYMOUS_ACTOR`** | `MEDIUM` | Event executed by `anonymous-user` or missing actor ID. |
| **`RAPID_FREQUENCY_ANOMALY`** | `MEDIUM` | High-frequency mutations ($\ge 4$ adjustments in $< 5$ seconds) on a single item. |

### B. Security Alerts Model & API
- All triggered violations are persisted into the `SecurityAlert` collection with severity tags (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- Logged immediately to `logs/error.log` / `logs/combined.log` via Winston.
- **Alerts Query Endpoint**:
  `GET /api/v1/compliance/alerts?severity=HIGH&status=ACTIVE`
