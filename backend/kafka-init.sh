#!/usr/bin/env bash

set -Eeuo pipefail

bootstrap_server="${KAFKA_BROKER:-kafka1:9092,kafka2:9093}"

# 1. Wait until KRaft controller metadata quorum is fully ready
echo "Waiting for Kafka cluster metadata quorum to settle..."
until /opt/kafka/bin/kafka-topics.sh --bootstrap-server "$bootstrap_server" --list > /dev/null 2>&1; do
  echo "Kafka broker RPCs not ready yet. Retrying in 2 seconds..."
  sleep 2
done

echo "Kafka cluster is ready. Initializing topics..."

# 2. Topic creation helper
create_topic() {
    local topic="$1"
    local partitions="$2"
    local replication_factor="$3"

    /opt/kafka/bin/kafka-topics.sh \
        --bootstrap-server "$bootstrap_server" \
        --create \
        --if-not-exists \
        --topic "$topic" \
        --partitions "$partitions" \
        --replication-factor "$replication_factor" \
        --config min.insync.replicas=1
}

# 3. Declare Topics
create_topic "user-comment" 2 2
create_topic "user-donation" 3 2

echo "Topic initialization completed successfully!"