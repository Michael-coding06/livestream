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
curl -X POST http://localhost:8087/events -H "Content-Type: application/json" -d "{\"room_id\":\"room1\",\"user_id\":\"user10\",\"type\":\"gift\",\"gift_value\":100}"
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

## Useful Docker checks

Run these commands from the `backend` directory.

Follow API (producer) logs:

```bash
docker compose logs -f --tail=100 api
```

Follow consumer logs:

```bash
docker compose logs -f --tail=100 consumer
```

Follow API and consumer logs together:

```bash
docker compose logs -f --tail=100 api consumer
```

Check the producer API health:

```bash
curl -i http://localhost:8087/health
```

Check the status of all Docker services:

```bash
docker compose ps
```

Check Kafka broker connectivity:

```bash
docker compose exec kafka /opt/kafka/bin/kafka-broker-api-versions.sh \
	--bootstrap-server localhost:9092
```

Check Kafka metadata quorum status:

```bash
docker compose exec kafka /opt/kafka/bin/kafka-metadata-quorum.sh \
	--bootstrap-server localhost:9092 describe --status
```

Check whether the consumer container is running:

```bash
docker compose ps consumer
docker compose top consumer
```

Inspect recent consumer errors:

```bash
docker compose logs --tail=100 consumer
```

The producer has an HTTP health endpoint. Kafka and the consumer use connectivity, container status, and logs because they do not currently expose dedicated health endpoints.
