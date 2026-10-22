# 🛡️ Day 16: Event Archival, Cold Storage & Disaster Recovery Guide

This guide details the Day 16 enterprise resilience additions to the **Audit Trail: Event-Sourced Inventory & Logistics Ledger**.

---

## 1. Event Archival & Cold Storage Strategy

In high-throughput event-sourced systems, the hot `EventStore` collection grows monotonically. Unchecked growth impacts database memory, index cache efficiency, and snapshot rehydration speeds.

### Archival Mechanics (`src/services/EventArchivalService.js`)
- **Safe Archival Boundary**: Events are only archived if:
  1. An aggregate has a verified, durable `Snapshot` at version $V_s$.
  2. The event version is strictly $V < V_s$.
  3. The event timestamp is older than the retention threshold (e.g., 30+ days).
- **Cold Storage Schema (`EventArchive`)**:
  - Events are enriched with an `archiveBatchId` and cryptographic SHA-256 `checksum`.
  - Stored in a separate collection optimized for cost-effective cold storage and compliance retention.
- **Unified Audit Retrieval**:
  - `EventArchivalService.getFullAuditTrailWithArchive(aggregateId)` seamlessly unions hot and cold collections so compliance auditors always see the full event history.

---

## 2. Read Model Projections Replay & Synchronization

A core superpower of CQRS & Event Sourcing is **complete self-healing**: if a database projection becomes corrupted or schema definitions change, the system can reconstruct its materialized views from scratch.

### How to Rebuild Projections
Run the automated synchronization script:
```bash
npm run rebuild-projections
```

### Process Flow (`scripts/rebuild-projections.js`)
1. **Truncation**: Wipes `InventoryItem` and `AnalyticsDashboardView` collections.
2. **Chronological Retrieval**: Loads all events (both archived and active) sorted by timestamp and version.
3. **Sequential Replay**: Passes each event through `InventoryProjector` and `RealTimeAnalyticsProjector`.
4. **Consistency Assertion**: Validates that all items and real-time metrics match the Event Store Source of Truth.

---

## 3. Disaster Recovery & Cryptographic Integrity Audits

To guarantee zero silent data corruption or unauthorized tampering across cold backups and live replicas, the system includes a forensic audit tool.

### How to Run Forensic Integrity Audit
```bash
npm run integrity-check
```

### Verification Checks (`scripts/disaster-recovery-integrity-check.js`)
1. **Sequence Continuity**: Confirms that every aggregate has a contiguous sequence of versions starting at $1$ ($v1, v2, v3, \dots, v_N$) with **zero missing gaps** and **zero duplicate versions**.
2. **Timestamp Monotonicity**: Verifies causal time consistency across events.
3. **Cryptographic Merkle Hash Chaining**: Computes an SHA-256 hash chain linking every event to its predecessor (`GENESIS` $\rightarrow$ $H_1$ $\rightarrow$ $H_2$ $\rightarrow \dots$).
4. **Snapshot Reconciliation**: Replays state up to the snapshot version to prove the snapshot is bit-for-bit identical to historical reality.
