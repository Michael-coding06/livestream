# StreamPulse

A minimal live-stream event processing backbone.

This project demonstrates:

- API ingestion with Go and Gin
- Kafka event buffering
- Go consumer processing
- MySQL room stats
- Redis gift leaderboard
- Docker Compose orchestration

## Run

```bash
go mod tidy
docker compose up --build
```

The API runs on:

```txt
http://localhost:8087
```

## Test

Health check:

```bash
curl http://localhost:8087/health
```

Send an event:

```bash
curl -X POST http://localhost:8087/events -H "Content-Type: application/json" -d "{\"room_id\":\"room1\",\"user_id\":\"user1\",\"type\":\"gift\",\"gift_value\":10}"
```

Read room stats:

```bash
curl -X GET http://localhost:8087/rooms/room1/stats
```

Read room leaderboard:

```bash
curl -X GET http://localhost:8087/rooms/room1/leaderboard
```

## Event Types

Supported `type` values:

- `comment`
- `like`
- `gift`
- `join`
