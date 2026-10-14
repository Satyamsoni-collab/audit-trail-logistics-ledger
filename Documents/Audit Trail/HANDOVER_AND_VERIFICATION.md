# 🚢 Project Handover & Verification Guide

This document is for Team Leads and DevOps engineers to verify the application deployment, review contributions, and ensure the CQRS Event-Sourced architecture maintains its integrity in production.

## 1. System Verification Checklist (For Code Reviewers)

When reviewing Pull Requests, ensure teammates adhere to the following principles:

- [ ] **No Direct Read-Model Mutation**: Are there any commands updating the MongoDB read model directly? (They shouldn't! Commands must *only* append events via `EventStoreService`).
- [ ] **Event Schema Integrity**: Does the new event adhere to the payload schema? Does it bump the version number?
- [ ] **Projector Idempotency**: If a new projector was added, does it check `event.version <= item.lastProcessedVersion` to prevent double-processing?
- [ ] **No Cross-Pipeline Imports**: Queries should never import Command Handlers. Commands should never query the Read Model for business logic.

## 2. CI/CD Pipeline & Testing
We have established a GitHub Actions pipeline (`.github/workflows/ci.yml`). 
- It spins up an ephemeral MongoDB container.
- It tests the system against Node.js 18.x and 20.x.
- **Rule**: Do not merge PRs if `npm test` fails in the pipeline.

### Running Tests Locally
```bash
# Ensure local MongoDB is running
npm run test
```

## 3. Production Deployment Strategy

### Environment Variables
Production deployments (Docker, AWS EC2, Heroku) require these exact variables:
```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://<user>:<pwd>@cluster.mongodb.net/audit-trail-prod
```

### Dockerization (Optional but Recommended)
To deploy, wrap this node app in a lightweight container:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Monitoring
Since the app uses `server.close()` graceful shutdown hooks:
- **PM2**: If using PM2, run `pm2 start npm --name "audit-ledger" -- run start`. PM2 will catch the exit codes perfectly.
- **Kubernetes**: K8s `SIGTERM` signals are natively handled by `server.js`, meaning no dropped HTTP requests during pod scaling.

---
**End of Day 8 Deliverable.** The system is fully tested, container-ready, and CI/CD enabled!
