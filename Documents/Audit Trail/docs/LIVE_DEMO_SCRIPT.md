# 🎬 Live Demo Script & Walkthrough

*Keep your screen shared with Postman/Insomnia on the left, and your MongoDB Compass/Database Viewer on the right.*

## Phase 1: The Command (Writing Data)
**Speaker**: "First, we will act as a warehouse manager bringing a new item into the system."
1. **Action**: Execute `POST /api/commands/inventory` (Payload: SKU, Name, Location).
2. **Speaker**: "Notice the 202 Accepted response. The system didn't just save an item; it validated the command and generated an `ITEM_CREATED` event."
3. **Action**: Open MongoDB Compass. Show the `EventStore` collection. Point out the immutable record, the version number `1`, and the timestamp.

## Phase 2: The Query (Reading Data)
**Speaker**: "Behind the scenes, our Event Bus asynchronously caught that event and updated our Read Model. Let's query it."
1. **Action**: Execute `GET /api/queries/inventory/:id`.
2. **Speaker**: "This is a lightning-fast read from our Projection collection. There is no business logic calculated here, just raw optimized data delivery."

## Phase 3: The Audit Trail (Event Sourcing Magic)
**Speaker**: "Now, let's add some stock to the item."
1. **Action**: Execute `POST /api/commands/inventory/:id/stock` (Payload: `+50`).
2. **Action**: Execute `POST /api/commands/inventory/:id/stock` (Payload: `-10`).
3. **Speaker**: "If an auditor asks *why* the stock is 40, traditional systems can't answer easily. We can."
4. **Action**: Execute `GET /api/v1/inventory/:id/audit`.
5. **Speaker**: "This endpoint returns the exact chronological ledger of every single change made to this specific item."

## Phase 4: State Verification & Snapshots
**Speaker**: "How do we prove our Read Model hasn't been corrupted by a database glitch?"
1. **Action**: Execute `GET /api/v1/inventory/:id/verify`.
2. **Speaker**: "This dynamically replayed the entire event stream in memory, calculated the true state, and compared it against the database projection. As you can see, `isConsistent: true`."
3. **Action**: Execute `POST /api/v1/inventory/:id/snapshot`.
4. **Speaker**: "To ensure this remains fast even after a million events, we just took a Snapshot. Future verifications will load this snapshot instantly and only calculate the delta events."

*End Demo.*
