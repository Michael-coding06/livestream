package services

import (
	"context"
	"encoding/json"
	"log"

	event "streampulse/models"

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

func (k *KafkaProducer) Produce(ctx context.Context, e event.Event) error {
	data, err := json.Marshal(e)
	if err != nil {
		return err
	}

	return k.writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(e.RoomID),
		Value: data,
	})
}

type KafkaConsumer struct {
	reader      *kafka.Reader
	leaderboard *LeaderboardQuerier 
	stats       *StatsQuerier
}

func NewKafkaConsumer(leaderboard *LeaderboardQuerier, stats *StatsQuerier) *KafkaConsumer {
	return &KafkaConsumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers: []string{brokerAddress},
			Topic:   topic,
			GroupID: "event-group-1",

		}),
		leaderboard: leaderboard,
		stats:       stats,
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

		msg, err := k.reader.ReadMessage(ctx)
		if err != nil {
			log.Printf("read error: %v", err)
			continue
		}


		var e event.Event
		if err := json.Unmarshal(msg.Value, &e); err != nil {
			log.Printf("unmarshal error (offset %d): %v\n", msg.Offset, err)
			continue
		}
		// go k.stats.UpdateStats(e)
		if e.Type == "gift" {
			go k.leaderboard.UpdateLeaderboard(ctx, e)
		}
		log.Printf("Received event: %+v", e)
	}
}