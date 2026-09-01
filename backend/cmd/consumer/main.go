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
	WorkerCount = 10
	BufferSize  = 1000
	topic       = "user-comment"
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

	consumer := services.NewKafkaConsumer(leaderboard, stats, db, rdb)
	defer consumer.Close()

	log.Println("consumer started, listening on topic:", topic)
	go consumer.ReadLoop(ctx, WorkerCount, BufferSize)

	<-ctx.Done()
	log.Println("consumer shutting down")
}
