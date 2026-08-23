# Project Review Summary

**Date:** 2026-08-22

## Overview
This livestream project has a solid baseline architecture:
- Ingestion API with Go and Gin
- Kafka producer and consumer
- Redis for live fanout and leaderboard
- MySQL for durable room, comments, and events data
- React frontend with WebSocket live chat

## Top Priority Fixes

### 1. Cross-room chat isolation is broken
- In the consumer, Redis keys/channels are hardcoded to room `1`.
- Impact: messages from all rooms mix together.
- Fix: use dynamic keys/channels based on event room id.

### 2. API returns success before Kafka confirms write
- Comment and gift endpoints return `202 Accepted` immediately while publishing in background goroutines.
- Impact: user sees success even if publish fails.
- Fix: synchronous publish before response, or outbox pattern for reliable async delivery.

### 3. Frontend gift request contract mismatch
- Frontend sends query `room_id` and string `user_id`, backend expects JSON `roomID` and int `user_id`.
- Impact: potential request failures and inconsistent behavior.
- Fix: send int IDs in JSON body for gift endpoint.

### 4. WebSocket loop does not handle Redis Pub/Sub channel close safely
- Impact: potential empty-message loop or unstable behavior on disconnect.
- Fix: check channel closed state during receive and exit loop cleanly.

### 5. ID type migration is incomplete in MySQL schema
- App logic moved to int IDs, but tables still use `VARCHAR` for `room_id` and `user_id`.
- Impact: larger indexes, type drift, avoidable conversions.
- Fix: migrate `room_id` and `user_id` columns to `BIGINT` across related tables.

## Medium Priority Improvements

### 1. Re-enable stats updater in consumer
- Stats update call is currently disabled.
- Result now: stats endpoint can be stale.

### 2. Tighten WebSocket origin policy
- Origin check currently allows everything.
- Use an allow-list for production frontend origins.

### 3. Align optimistic chat user identity
- Incoming messages use numeric user id text, optimistic local messages use a different marker.
- Fix to improve duplicate reconciliation.

### 4. Ensure consumer resource cleanup
- Add explicit close and startup health checks for DB/Redis in consumer process.

## Database and Index Recommendations

### 1. Standardize ID types
- `rooms.room_id`: `BIGINT`
- `room_stats.room_id`: `BIGINT`
- `events.room_id`, `events.user_id`: `BIGINT`
- `comments.room_id`, `comments.user_id`: `BIGINT`

### 2. Keep and extend useful indexes
- Keep comments index by room and created time.
- Add events index on `(room_id, created_at)`.
- Add events index on `(room_id, type, created_at)`.
- Optionally add events index on `(room_id, user_id, created_at)` for user activity analytics.

## Kafka Recommendations

### 1. Create topic explicitly
- Set controlled partition count instead of relying on defaults.

### 2. Keep room-based message key
- Preserves per-room ordering while allowing cross-room parallelism.

### 3. Move broker/topic/group config to environment variables
- Avoid hardcoded runtime settings.

### 4. Plan for at-least-once processing
- Add idempotency key or event id for safe retries in consumer writes.

## Redis Recommendations

### 1. Use consistent key naming
- `room:<roomId>:comments`
- `room:<roomId>:live`
- `leaderboard:<roomId>`

### 2. Keep TTL for ephemeral chat history
- Already a good pattern, keep it.

### 3. Expand room cleanup
- Delete all room-scoped keys on room deletion, not only leaderboard key.

## Docs and Developer Experience

1. Update backend docs to current endpoints and int ID payloads.
2. Add a short architecture/runbook section:
- data flow
- retry behavior
- failure handling
- topic/key naming conventions

## Suggested Execution Plan

### Phase 1 (Stability)
- Fix Redis room key hardcoding in consumer.
- Fix frontend gift payload contract to backend.
- Handle Redis Pub/Sub channel close in websocket loop.
- Choose sync Kafka writes or outbox pattern for reliability.

### Phase 2 (Data Model)
- Migrate `room_id` and `user_id` columns to `BIGINT` across schema.
- Align Go structs and SQL scans with `BIGINT` usage.
- Re-enable stats updater and verify stats endpoint behavior.

### Phase 3 (Scale and Operations)
- Create Kafka topic explicitly with planned partition count.
- Externalize Kafka configuration to environment variables.
- Add additional events indexes based on query paths.
- Refresh README with accurate endpoints, payloads, and runbook notes.
