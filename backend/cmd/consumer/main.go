package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"streampulse/cmd/services"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	_ "github.com/go-sql-driver/mysql"
)

const (
	WorkerCount = 20
	BufferSize  = 1000
)

func main() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("no .env file found, relying on real env vars")
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
		<-quit
		log.Println("shutdown signal received")
		cancel()
	}()

	db, err := sql.Open("mysql", os.Getenv("MYSQL_DSN"))
	if err != nil {
		panic(err)
	}
	defer db.Close()

	stats := services.NewStatsQuerier(db)
	rdb := redis.NewClient(&redis.Options{Addr: os.Getenv("REDIS_ADDR")})
	defer rdb.Close()

	leaderboard := services.NewLeaderboardQuerier(rdb)

	// === Kafka Consumers initialization ===
	commentConsumer := services.NewKafkaConsumer(leaderboard, stats, db, rdb, "user-comment", "cg-comments")
	defer commentConsumer.Close()

	donationConsumer := services.NewKafkaConsumer(leaderboard, stats, db, rdb, "user-donation", "cg-donations")
	defer donationConsumer.Close()
	// ======================================

	// var wg sync.WaitGroup
	// wg.Add(2)

	go func() {
		// defer wg.Done()
		log.Println("Consumer started, listening on topic: user-comment")
		commentConsumer.ReadLoop(ctx, WorkerCount, BufferSize)
	}()

	go func() {
		// defer wg.Done()
		log.Println("Consumer started, listening on topic: user-donation")
		donationConsumer.ReadLoop(ctx, WorkerCount, BufferSize)
	}()

	<-ctx.Done()
	log.Println("Shutting down consumers...")

	// wg.Wait()
	log.Println("All consumers shut down successfully.")
}
