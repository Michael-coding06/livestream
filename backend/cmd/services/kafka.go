package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	event "streampulse/models"

	"github.com/redis/go-redis/v9"
	"github.com/segmentio/kafka-go"
)

type TopicSpec struct {
	Name              string
	NumPartitions     int
	ReplicationFactor int
	MinInSyncReplicas string
}

// Declare all application topics in a single slice
var AppTopics = []TopicSpec{
	{
		Name:              "user-comment",
		NumPartitions:     2,
		ReplicationFactor: 2,
		MinInSyncReplicas: "1",
	},
	{
		Name:              "user-donation",
		NumPartitions:     3,
		ReplicationFactor: 2,
		MinInSyncReplicas: "1",
	},
}

func BrokerAddresses() []string {
	if addresses := os.Getenv("KAFKA_BROKER"); addresses != "" {
		return strings.Split(addresses, ",")
	}
	return []string{"localhost:9092", "localhost:9093"} // default broker addresses
}

type KafkaProducer struct {
	writer *kafka.Writer
}

func EnsureTopicsExist(brokers []string, specs []TopicSpec) error {
	client := &kafka.Client{
		Addr:    kafka.TCP(brokers...),
		Timeout: 10 * time.Second,
	}

	topicConfigs := make([]kafka.TopicConfig, len(specs))
	for i, spec := range specs {
		topicConfigs[i] = kafka.TopicConfig{
			Topic:             spec.Name,
			NumPartitions:     spec.NumPartitions,
			ReplicationFactor: spec.ReplicationFactor,
			ConfigEntries: []kafka.ConfigEntry{
				{
					ConfigName:  "min.insync.replicas",
					ConfigValue: spec.MinInSyncReplicas,
				},
			},
		}
	}

	resp, err := client.CreateTopics(context.Background(), &kafka.CreateTopicsRequest{
		Topics: topicConfigs,
	})
	if err != nil {
		return err
	}

	for topicName, topicErr := range resp.Errors {
		if topicErr != nil {
			if errors.Is(topicErr, kafka.TopicAlreadyExists) {
				log.Printf("Topic %q already exists. Skipping.", topicName)
				continue
			}
			log.Printf("Failed to create topic %q: %v", topicName, topicErr)
			return topicErr
		}
		log.Printf("Successfully declared topic %q", topicName)
	}

	return nil
}

// debug function
func PrintKafkaClusterMap(brokers []string, topics []TopicSpec) {
	client := &kafka.Client{
		Addr:    kafka.TCP(brokers...),
		Timeout: 5 * time.Second,
	}

	// Extract topic names from []TopicSpec into []string
	topicNames := make([]string, len(topics))
	for i, t := range topics {
		topicNames[i] = t.Name
	}

	resp, err := client.Metadata(context.Background(), &kafka.MetadataRequest{
		Topics: topicNames,
	})
	if err != nil {
		log.Fatalf("Failed to fetch metadata: %v", err)
	}

	fmt.Println("=== DISCOVERED BROKERS ===")
	for _, b := range resp.Brokers {
		fmt.Printf("• Broker ID %d: %s:%d\n", b.ID, b.Host, b.Port)
	}

	for _, t := range resp.Topics {
		fmt.Printf("\n=== PARTITION MAP FOR TOPIC: %s ===\n", t.Name)
		for _, p := range t.Partitions {
			replicaIDs := []int{}
			for _, r := range p.Replicas {
				replicaIDs = append(replicaIDs, r.ID)
			}
			isrIDs := []int{}
			for _, isr := range p.Isr {
				isrIDs = append(isrIDs, isr.ID)
			}

			fmt.Printf("• Partition [%d] -> Leader: Broker %d | Replicas: %v | In-Sync Replicas: %v\n",
				p.ID, p.Leader.ID, replicaIDs, isrIDs)
		}
	}
}

func NewKafkaProducer(topic string) *KafkaProducer {
	return &KafkaProducer{
		writer: &kafka.Writer{
			Addr:         kafka.TCP(BrokerAddresses()...),
			Topic:        topic,
			Balancer:     &kafka.LeastBytes{},
			RequiredAcks: kafka.RequireAll, // Ensures acks=all for replication_factor=2
			BatchTimeout: 100 * time.Millisecond,
			BatchSize:    100,
		},
	}
}

func (k *KafkaProducer) Close() error {
	return k.writer.Close()
}

func (k *KafkaProducer) Produce(ctx context.Context, e event.EventPayload) error {
	data, err := json.Marshal(e) // convert Go value to Json data
	log.Println("Produce event data: ", string(data))
	if err != nil {
		return err
	}

	return k.writer.WriteMessages(ctx, kafka.Message{
		Value: data,
	})
}

type KafkaConsumer struct {
	reader      *kafka.Reader
	leaderboard *LeaderboardQuerier
	stats       *StatsQuerier
	db          *sql.DB       // <--- Add MySQL connection
	rdb         *redis.Client // <--- Add Redis connection
}

func NewKafkaConsumer(leaderboard *LeaderboardQuerier, stats *StatsQuerier, db *sql.DB, rdb *redis.Client, topic string, groupID string) *KafkaConsumer {
	return &KafkaConsumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers:     BrokerAddresses(),
			Topic:       topic,
			GroupID:     groupID,
			StartOffset: kafka.FirstOffset,
			MaxWait:     100 * time.Millisecond, // wait for the at most 0.1s

		}),
		leaderboard: leaderboard,
		stats:       stats,
		db:          db,
		rdb:         rdb,
	}
}

func (k *KafkaConsumer) Close() error {
	return k.reader.Close()
}

// This is the function to keep pulling message from kafka, this will be made a goroutine in the main file
func (k *KafkaConsumer) ReadLoop(ctx context.Context, workerCount int, bufferSize int) {
	// create a go channel to store messages (chan in go has its own mutex lock to prevent race condition)
	jobs := make(chan kafka.Message, bufferSize) // jobs channel can store at most 'bufferSize' messages

	for i := 1; i <= workerCount; i++ {
		go k.worker(ctx, i, jobs)
	}

	for {
		select {
		case <-ctx.Done():
			close(jobs)
			return

		default:
		}

		// consumer scans and pulls new event
		msg, err := k.reader.ReadMessage(ctx)
		if err != nil {
			log.Printf("read error: %v", err)
			continue
		}

		// push the message into the channel, the workers will handle the later logic
		jobs <- msg
	}
}

func (k *KafkaConsumer) worker(ctx context.Context, workerID int, jobs <-chan kafka.Message) {
	for msg := range jobs {
		var e event.EventPayload
		if err := json.Unmarshal(msg.Value, &e); err != nil {
			log.Printf("unmarshal error (offset %d): %v\n", msg.Offset, err)
			continue
		}

		// If Redis takes longer than 5s, the context cancels and frees the worker!
		msgCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		func() {
			defer cancel()

			fmt.Printf("Worker [%d] received an event: %s\n", workerID, e.Type)

			switch e.Type {
			case "gift":
				k.leaderboard.UpdateLeaderboard(msgCtx, e, e.GiftValue)

				giftJSON, err := json.Marshal(map[string]interface{}{
					"type":           "gift",
					"room_id":        e.RoomID,
					"user_id":        e.UserID,
					"user_name":      e.UserName,
					"donation_value": e.GiftValue,
				})
				if err != nil {
					log.Printf("failed to convert comment into JSON: %v", err)
					return
				}

				pubsubChannel := fmt.Sprintf("room:%d:live", e.RoomID)
				if err := k.rdb.Publish(msgCtx, pubsubChannel, giftJSON).Err(); err != nil {
					log.Printf("failed to publish comment to pub/sub: %v", err)
				}

			case "comment":
				commentPayload, err := json.Marshal(map[string]interface{}{
					"type":        "comment",
					"commentJSON": e,
				})
				if err != nil {
					log.Printf("failed to convert comment into JSON: %v", err)
					return
				}

				// declare a list to store messages
				listKey := fmt.Sprintf("room:%d:comments", e.RoomID)

				pipe := k.rdb.Pipeline()
				pipe.LPush(msgCtx, listKey, commentPayload)
				pipe.LTrim(msgCtx, listKey, 0, 9)
				pipe.Expire(msgCtx, listKey, 24*time.Hour)

				// send the new messgae (with commands to push, trim and live-time property) to redis to update redis list memory
				if _, err := pipe.Exec(msgCtx); err != nil {
					log.Printf("failed to update redis comments list: %v", err)
				}

				pubsubChannel := fmt.Sprintf("room:%d:live", e.RoomID)
				if err := k.rdb.Publish(msgCtx, pubsubChannel, commentPayload).Err(); err != nil {
					log.Printf("failed to publish comment to pub/sub: %v", err)
				}

			default:
				log.Printf("unknown event type received: %s", e.Type)
			}
		}()
	}
}
