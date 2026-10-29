# Day 27: Production API Security Hardening, Redis Rate Limiting, and Zero-Trust RBAC

## 1. Architectural Overview

Day 27 hardens the "Audit Trail: Event-Sourced Inventory & Logistics Ledger" with enterprise-grade defense-in-depth security, distributed rate limiting, and Zero-Trust Role-Based Access Control (RBAC):

```
+---------------------------------------------------------------------------------------------------+
|                                 DAY 27 DEFENSE-IN-DEPTH ARCHITECTURE                              |
|                                                                                                   |
|  [ React Frontend (Vite) ]                                                                        |
|       |                                                                                           |
|       | 1. Strict CORS & Secure Headers (Origin Validation, CSP, HSTS, X-Frame-Options: DENY)     |
|       v                                                                                           |
|  [ Express API Gateway / Reverse Proxy ]                                                          |
|       |                                                                                           |
|       +---> [ 2. Request Sanitization & Size Guard ] (10kb max payload, Proto-Pollution Filter)   |
|       |                                                                                           |
|       +---> [ 3. Distributed Redis Rate Limiter ]                                                 |
|       |       - Command Limiter: 30 req/min (Anti-DoS / Event Store Protection)                   |
|       |       - Query Limiter: 120 req/min                                                        |
|       |       - Auth Limiter: 15 req/15 min (Anti-Brute-Force)                                    |
|       |                                                                                           |
|       +---> [ 4. Enterprise JWT Authentication ] (`requireAuth`)                                  |
|       |       - HS256 Signed Claims (User ID, Role, Clearance, Issuer: audit-trail-ledger)        |
|       |                                                                                           |
|       +---> [ 5. Zero-Trust RBAC & ABAC Enforcement ] (`requireRole`, `authorize`)               |
|               |                                                                                   |
|               +--- [ State-Changing Commands ] ---> CISO_ADMIN, LOGISTICS_MANAGER, WAREHOUSE_OP    |
|               |       (Appends to Immutable EventStore with Cryptographic Actor Fingerprint)     |
|               |                                                                                   |
|               +--- [ Read-Only Queries ] --------> PUBLIC_VIEWER, COMPLIANCE_AUDITOR              |
|                       (Serves cached read models without write privileges)                        |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Key Modules Delivered

### 1. API Security & Hardening (`src/app.js`)
- **Helmet.js Integration**:
  - Content Security Policy (CSP) whitelisting application origins and WebSockets (`ws:`, `wss:`).
  - Strict HTTP Strict Transport Security (HSTS) with 1-year max-age (`31536000s`) and subdomains inclusion.
  - Frameguard set to `deny` to prevent clickjacking attacks.
  - `X-Content-Type-Options: nosniff` and XSS protection filters.
- **Strict CORS Policy**:
  - Validates origins dynamically against whitelisted hosts (`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`, `process.env.CLIENT_URL`).
  - Blocks unauthorized cross-origin requests while preserving non-browser CLI/microservice calls.
- **Request Payload Size Limits & Anti-Injection**:
  - Enforced strict `10kb` limit on `express.json()` and `express.urlencoded()`, returning `413 Payload Too Large` to guard against memory exhaustion and buffer overflows.
  - Integrated `express-mongo-sanitize` to strip `$` and `.` operator injections.
  - Built-in prototype pollution scanner blocking reserved keys (`__proto__`, `constructor`, `prototype`) with `400 Bad Request (MALFORMED_PAYLOAD)`.

### 2. Distributed Rate Limiting & Throttling (`src/api/middlewares/rateLimiter.middleware.js`)
- **Redis-Backed Distributed Store**:
  - Integrates `rate-limit-redis` with automatic in-memory fallback if Redis is unavailable or in offline environments.
  - Returns RFC draft-compliant standard `RateLimit-*` headers (`ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset`).
- **Tiered Limiting Policies**:
  - **CQRS Command Write Limiter**: Max 30 writes/minute per IP on `/api/commands/*` to protect the immutable Event Store from flood attacks.
  - **Read-Model Query Limiter**: Max 120 requests/minute per IP on `/api/queries/*`.
  - **Auth Rate Limiter**: Max 15 attempts/15 minutes on `/api/v1/auth/login` to thwart credential stuffing and brute-force attacks.

### 3. Authentication & Zero-Trust RBAC (`src/utils/jwt.js`, `src/api/middlewares/auth.middleware.js`, `src/api/middlewares/rbac.middleware.js`)
- **Enterprise JWT Signer & Verifier**:
  - Secure signing with HS256, issuer (`audit-trail-ledger`), audience (`audit-trail-api`), and configurable expiration (`8h`).
  - Pre-configured enterprise identity accounts for development and auditing:
    - `admin@audittrail.io` (LOGISTICS_MANAGER, HIGH clearance)
    - `ciso@audittrail.io` (CISO_ADMIN, CONFIDENTIAL clearance)
    - `auditor@audittrail.io` (COMPLIANCE_AUDITOR, HIGH clearance)
    - `viewer@audittrail.io` (PUBLIC_VIEWER, STANDARD clearance)
- **Role & Clearance Matrix**:
  | Role | Permissions | Clearance | Command Access | Query Access |
  | :--- | :--- | :--- | :--- | :--- |
  | `CISO_ADMIN` | All write, audit, projection repair, diagnostics | CONFIDENTIAL | Full | Full |
  | `LOGISTICS_MANAGER` | `inventory:create`, `stock:update`, `compliance:read`, `audit:verify` | HIGH | Full | Full |
  | `WAREHOUSE_OPERATOR` | `stock:update`, `inventory:read` | STANDARD | Stock updates only | Full |
  | `COMPLIANCE_AUDITOR` | `compliance:read`, `audit:verify`, `audit:external` | HIGH | None (Read-Only) | Full |
  | `PUBLIC_VIEWER` | `inventory:read` | STANDARD | Denied (`403 Forbidden`) | Public tracking |
- **Cryptographic Actor Fingerprinting**:
  - Each authorized state-changing request generates a SHA-256 actor fingerprint bound to `actorId:role:clearance:ip`.
  - Provenance fingerprint is stored alongside the immutable event in MongoDB EventStore.

### 4. Interactive Frontend Role Switcher (`frontend/src/Mainpage.tsx` & `frontend/src/services/api.js`)
- **RBAC Role Selector Dropdown**: Enables live switching between `LOGISTICS_MANAGER`, `CISO_ADMIN`, `COMPLIANCE_AUDITOR`, and `PUBLIC_VIEWER`.
- **Live Security Badge**: Displays active role, clearance level, and JWT authentication status in the dashboard header.
- **Dynamic API Client**:
  - Persists and injects active JWT Bearer token into outgoing HTTP headers via `getAuthHeaders()`.
  - Dispatches write commands with active enterprise role claims.

---

## 3. Automated Verification

- **Integration Test Suite**: `tests/integration/day27SecurityAndRBAC.test.js`
  - 13 comprehensive test specs verifying:
    - Helmet security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS).
    - CORS origin whitelisting.
    - 10kb body payload truncation with `413 Payload Too Large`.
    - Prototype pollution interceptor with `400 Bad Request`.
    - Distributed RateLimit headers on commands and queries.
    - Login and JWT issuance with enterprise role claims.
    - Unauthenticated command rejection (`401 UNAUTHORIZED_MISSING_TOKEN`).
    - RBAC command rejection for `PUBLIC_VIEWER` (`403 FORBIDDEN_INSUFFICIENT_ROLE`).
    - Successful state-changing command execution for `LOGISTICS_MANAGER` (HTTP 202).
    - Role directory discovery endpoint (`GET /api/v1/auth/roles`).
- **Frontend Verification**:
  - `npm run build` executed in `frontend/` passing with exit code `0`.
