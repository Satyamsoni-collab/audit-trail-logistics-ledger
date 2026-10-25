# 🚀 Scalability, Resilience & Deployment Guide

This document outlines the production-ready strategies implemented on Day 12 to ensure our CQRS and Event-Sourced architecture can scale seamlessly without downtime.

## 1. Zero-Downtime Rolling Deployments
When deploying new features or updating projectors, we must avoid dropping HTTP requests or corrupting event streams.

### **Strategy**:
- **Health Checks**: Our `docker-compose.yml` configures MongoDB health checks. The Node.js application will only start once MongoDB is fully ready.
- **Graceful Shutdown**: Node.js intercepts `SIGINT`/`SIGTERM` (configured in `server.js`). It stops accepting new requests, finishes processing existing ones, and cleanly disconnects from Mongoose before exiting. 
- **Kubernetes / Docker Swarm**: In orchestration, always configure rolling updates. Bring up the new container, wait for the `/api/health` endpoint to return `200 OK`, route traffic to it, and gracefully shut down the old one.

## 2. Event Store Indexing & Query Optimization
In an Event-Sourced system, the `EventStore` grows exponentially. Without proper indexing, state replays will cause massive CPU spikes on the database.

### **Implemented Indexes**:
- `{ aggregateId: 1, version: 1 }`: Ensures we can quickly retrieve the event stream for a specific item in chronological order. We enforce a `unique: true` constraint here to provide **Optimistic Concurrency Control** (preventing race conditions if two threads try to write version `5` simultaneously).
- `{ aggregateId: 1, version: -1 }`: (On the `Snapshot` collection) Allows us to instantly fetch the *latest* snapshot without scanning previous ones.

## 3. Resilience: Connection Retries & Error Monitoring
- **Mongoose Reconnection**: Mongoose natively buffers commands if the connection drops. Ensure `bufferCommands: true` (the default) is kept so temporary database blips don't throw 500 errors.
- **Structured Logging (Winston & Morgan)**: 
  - Standard `console.log` is blocking and inefficient in production. We implemented `winston` to asynchronously format logs in JSON or structured text, writing errors to `logs/error.log` and standard traffic to `logs/combined.log`.
  - `morgan` intercepts all HTTP traffic and pipes it directly into our Winston logger.
  - This structure easily integrates with external log aggregators like ELK (Elasticsearch, Logstash, Kibana) or Datadog.

## 4. Scaling the CQRS Pipelines
Currently, both pipelines run in the same Node.js process. As load increases, you can split this:
1. **Command API Nodes**: Deploy instances that *only* handle the `app.use('/api/commands', ...)` routes.
2. **Query API Nodes**: Deploy instances that *only* handle `app.use('/api/queries', ...)` routes.
3. **Dedicated Projector Worker**: Extract `InventoryProjector.js` into its own microservice that listens to a real message broker (like RabbitMQ or Kafka) instead of the in-memory Node EventEmitter.

---
**Prepared by Satyam Soni & Team.**
