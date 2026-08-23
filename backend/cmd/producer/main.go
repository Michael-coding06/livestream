package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"

	handlers "streampulse/cmd/handlers"
	"streampulse/cmd/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

func main() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("no .env file found, relying on real env vars")
	}

	db, err := sql.Open("mysql", os.Getenv("MYSQL_DSN"))
	if err != nil {
		panic(err)
	}
	defer db.Close()

	rdb := redis.NewClient(&redis.Options{Addr: os.Getenv("REDIS_ADDR")})
	defer rdb.Close()

	kafka := services.NewKafkaProducer()
	defer kafka.Close()

	stats := services.NewStatsQuerier(db)
	leaderboard := services.NewLeaderboardQuerier(rdb)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	/*
		ROOM ENDPOINTS
	*/
	r.POST("/room/create", handlers.CreateRoom(db)) // events, but no need to push to Kafka now
	r.GET("/rooms", handlers.GetRooms(db))
	r.DELETE("/room/delete", handlers.DeleteRoom(db, rdb)) // events, but no need to push to Kafka now
	r.GET("/rooms/:room_id/stats", handlers.GetRoomStats(stats))
	r.GET("/rooms/:room_id/leaderboard", handlers.GetRoomLeaderboard(leaderboard))

	/*
		EVENTS ENDPOINTS: comments, donations,...
	*/
	r.POST("/comment/create", handlers.CreateComment(kafka))
	r.POST("/flower/send", handlers.SendFlower(db, kafka))

	/*
		WEBSOCKET ENDPOINTS
	*/
	r.GET("/ws/comments/:room_id", handlers.StreamChatWS(rdb))

	if err := r.Run(":8087"); err != nil {
		panic(err)
	}
}
