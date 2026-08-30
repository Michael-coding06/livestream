package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	event "streampulse/models"

	"github.com/redis/go-redis/v9"
	"github.com/segmentio/kafka-go"
)

const (
	brokerAddress = "localhost:9092"
	topic         = "event"
	// groupID    = "event-group-1"
)

type KafkaProducer struct {
	writer *kafka.Writer
}

func NewKafkaProducer() *KafkaProducer {
	return &KafkaProducer{
		writer: &kafka.Writer{
			Addr:     kafka.TCP(brokerAddress),
			Topic:    topic,
			Balancer: &kafka.LeastBytes{},
			// AllowAutoTopicCreation: true,
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
		Key:   []byte(strconv.Itoa(e.RoomID)),
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

func NewKafkaConsumer(leaderboard *LeaderboardQuerier, stats *StatsQuerier, db *sql.DB, rdb *redis.Client) *KafkaConsumer {
	return &KafkaConsumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers: []string{brokerAddress},
			Topic:   topic,
			GroupID: "event-group-1",
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
func (k *KafkaConsumer) ReadLoop(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		// consumer scans and pulls new event
		msg, err := k.reader.ReadMessage(ctx)
		log.Printf("hello\n")
		if err != nil {
			log.Printf("read error: %v", err)
			continue
		}

		var e event.EventPayload
		// convert raw Json data to Go data
		if err := json.Unmarshal(msg.Value, &e); err != nil {
			log.Printf("unmarshal error (offset %d): %v\n", msg.Offset, err)
			continue
		}

		fmt.Printf("kafka event: %+v\n", e)
		// go k.stats.UpdateStats(e)
		switch e.Type {
		case "gift":
			// Update leaderboard using gift.GiftValue
			k.leaderboard.UpdateLeaderboard(ctx, e, e.GiftValue)

		case "comment":
			// Save comment into MySQL
			_, err := k.db.ExecContext(ctx, `
                INSERT INTO comments (room_id, user_id, content)
                VALUES (?, ?, ?)
            `, e.RoomID, e.UserID, e.Content)

			if err != nil {
				log.Printf("failed to insert comment into DB: %v", err)
				continue
			}

			commentJSON, err := json.Marshal(e)
			listKey := fmt.Sprintf("room:%d:comments", e.RoomID)

			// Use a pipeline to send LPush, LTrim, and Expire in exactly ONE network request
			pipe := k.rdb.Pipeline()
			pipe.LPush(ctx, listKey, commentJSON)
			pipe.LTrim(ctx, listKey, 0, 9)          // Keep only index 0 to 9 (10 comments)
			pipe.Expire(ctx, listKey, 24*time.Hour) // Auto-delete room data after 24h

			go func() {
				if _, err := pipe.Exec(ctx); err != nil {
					log.Printf("failed to update redis comments list: %v", err)
				}

				pubsubChannel := fmt.Sprintf("room:%d:live", e.RoomID)
				if err := k.rdb.Publish(ctx, pubsubChannel, commentJSON).Err(); err != nil {
					log.Printf("failed to publish comment to pub/sub: %v", err)
				}
			}()
		default:
			log.Printf("unknown event type received: %s", e.Type)
		}
		log.Printf("Received event: %+v", e)
	}
}
