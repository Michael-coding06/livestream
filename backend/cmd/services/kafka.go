package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	// "strconv"
	"time"

	event "streampulse/models"

	"github.com/redis/go-redis/v9"
	"github.com/segmentio/kafka-go"
)

const (
	brokerAddress = "localhost:9092"
	topic         = "user-comment"
	// groupID    = "event-group-1"
)

type KafkaProducer struct {
	writer *kafka.Writer
}

func NewKafkaProducer() *KafkaProducer {
	return &KafkaProducer{
		writer: &kafka.Writer{
			Addr:         kafka.TCP(brokerAddress),
			Topic:        topic,
			Balancer:     &kafka.LeastBytes{},
			BatchTimeout: 100 * time.Millisecond,
			BatchSize:    100,
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
		// Key:   []byte(strconv.Itoa(e.RoomID)), No need key for LeastBytes balancer
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
			Brokers:     []string{brokerAddress},
			Topic:       topic,
			GroupID:     "debug-event-group-1",
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
	jobs := make(chan kafka.Message, bufferSize) // jobs channel can store at most 1000 messages

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
		log.Printf("Attempting to push message to jobs channel...")
		jobs <- msg
		log.Printf("Successfully pushed message to jobs channel!")
	}
}

func (k *KafkaConsumer) worker(ctx context.Context, workerID int, jobs <-chan kafka.Message) {
	for msg := range jobs {
		var e event.EventPayload
		if err := json.Unmarshal(msg.Value, &e); err != nil {
			log.Printf("unmarshal error (offset %d): %v\n", msg.Offset, err)
			continue
		}

		// If MySQL or Redis takes longer than 5s, the context cancels and frees the worker!
		msgCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		func() {
			defer cancel()

			fmt.Printf("Worker [%d] received an event: %s\n", workerID, e.Type)
			// go k.stats.UpdateStats(e)
			switch e.Type {
			case "gift":
				// Update leaderboard using gift.GiftValue
				k.leaderboard.UpdateLeaderboard(msgCtx, e, e.GiftValue)

			case "comment":
				_, err := k.db.ExecContext(msgCtx, `
                INSERT INTO comments (room_id, user_id, content, user_name)
                VALUES (?, ?, ?, ?)
            `, e.RoomID, e.UserID, e.Content, e.Username)
				if err != nil {
					log.Printf("failed to insert comment into DB: %v", err)
					return
				}

				commentJSON, err := json.Marshal(e)
				listKey := fmt.Sprintf("room:%d:comments", e.RoomID)

				pipe := k.rdb.Pipeline()
				pipe.LPush(msgCtx, listKey, commentJSON)
				pipe.LTrim(msgCtx, listKey, 0, 9)
				pipe.Expire(msgCtx, listKey, 24*time.Hour)

				if _, err := pipe.Exec(msgCtx); err != nil {
					log.Printf("failed to update redis comments list: %v", err)
				}

				pubsubChannel := fmt.Sprintf("room:%d:live", e.RoomID)
				if err := k.rdb.Publish(msgCtx, pubsubChannel, commentJSON).Err(); err != nil {
					log.Printf("failed to publish comment to pub/sub: %v", err)
				}

			default:
				log.Printf("unknown event type received: %s", e.Type)
			}
		}()
	}
}
