#!/usr/bin/env bash

set -Eeuo pipefail

bootstrap_server="${KAFKA_BROKER:-kafka:9092}"

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
		--replication-factor "$replication_factor"
}

create_topic "user-comment" 1 1
