# 📦 Audit Trail: Event-Sourced Inventory & Logistics Ledger

A robust, enterprise-grade Inventory & Logistics tracking system built on **Node.js, Express, and MongoDB**, utilizing the **CQRS (Command Query Responsibility Segregation)** pattern and **Event Sourcing** architecture.

---

## 🏗️ Architecture Overview

Unlike traditional CRUD applications where database records are overwritten (mutated) upon every update, this system treats state changes as an immutable stream of events.

1. **Commands (Write operations)**: Only validate actions and append events to an immutable append-only `EventStore`.
2. **Event Sourcing**: The `EventStore` acts as the definitive Source of Truth. If the database crashes or read models get corrupted, the entire system state can be accurately reconstructed by replaying the event stream from version `0`.
3. **Projectors**: Listen asynchronously to new events published by the Event Bus and update the heavily optimized Read Models (Projections).
4. **Queries (Read operations)**: Fetch data instantly from the optimized Read Models without complex joins or business logic calculation.

### System Diagram Flow

```text
Client Request --> Command Route --> Command Handler --> EventStoreService (Appends Event) 
                                                                |
                                                                v
Client Request <---- Query Route <----- Read Model <------- Projector (Updates Projection)
```

---

## 🛠️ Features & Security

- **CQRS Architecture**: Complete separation of read and write pipelines.
- **Optimistic Concurrency Control**: Prevents race conditions during simultaneous writes using version numbering in the Event Store.
- **State Replay (Self-Healing)**: An API to rebuild current aggregate state dynamically by replaying its historical events.
- **Robust Security**: Integrated `helmet`, `express-rate-limit`, `express-mongo-sanitize`, and JSON body size limits to prevent injection and DOS attacks.
- **Graceful Shutdown**: Production-ready lifecycle management.
- **Global Error Handling**: Standardized JSON error response mapping domain exceptions to HTTP codes.

---

## 🚀 Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on port 27017 or via Docker/Atlas)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy the `.env.example` file and configure your variables:
```bash
cp .env.example .env
```

### 3. Start the Server
For development (with hot-reload via watch mode):
```bash
npm run dev
```

For production:
```bash
npm start
```

---

## 📚 API Endpoints Documentation

### **1. Commands (Write Pipeline)**
Base URL: `/api/commands`

| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| **POST** | `/inventory` | Create a new inventory item | `{ "sku": "...", "name": "...", "location": "..." }` |
| **POST** | `/inventory/:id/stock` | Add or remove stock from an item | `{ "quantityChange": 50 }` (Use negative for removal) |

*Note: Command endpoints return HTTP 202 (Accepted) as processing is asynchronous.*

### **2. Queries (Read Pipeline)**
Base URL: `/api/queries`

| Method | Endpoint | Description | Response |
| :--- | :--- | :--- | :--- |
| **GET** | `/inventory/:id` | Fetch current state from the Read Model | Returns current item data & quantity |

### **3. Audit & Compliance (V1 Pipeline)**
Base URL: `/api/v1`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/inventory/:id/audit` | Retrieves the immutable, chronological history of events for an item. |
| **GET** | `/inventory/:id/verify`| Triggers the **State Replay** logic. Reconstructs state from the Event Store and compares it against the Projection Read Model to verify consistency. |

---

## 📜 Error Handling Standard

All APIs return standardized error JSON formats. 
Domain exceptions are automatically mapped to HTTP status codes:
- `ValidationException` -> `400 Bad Request`
- `NotFoundException` -> `404 Not Found`
- `ConcurrencyException` -> `409 Conflict`

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "AggregateId is required."
}
```

---
**Maintained by Satyam Soni & Team.**
