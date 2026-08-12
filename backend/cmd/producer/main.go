package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"streampulse/cmd/services"
	event "streampulse/models"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

type createRoomRequest struct {
	Name string `json:"name"`
	Host string `json:"host"`
}

type createCommentRequest struct {
	Comment string `json:"comment"`
	RoomID  string `json:"roomID"`
	UserID  string `json:"user_id"`
}

type sendGiftRequest struct {
	RoomID    string `json:"roomID"`
	UserID    string `json:"user_id"`
	Count     int    `json:"count"`
	GiftValue int    `json:"gift_value"`
}

func main() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("no .env file found, relying on real env vars")
	}
	ctx := context.Background()

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

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/room/create", func(c *gin.Context) {
		var req createRoomRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		name := strings.TrimSpace(req.Name)
		host := strings.TrimSpace(req.Host)
		if name == "" || host == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "name and host are required"})
			return
		}

		if _, err := db.Exec(`
			INSERT INTO rooms (name, host)
			VALUES (?, ?)
		`, name, host); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create room"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"room": gin.H{
				"name": name,
				"host": host,
			},
		})
	})

	r.GET("/rooms", func(c *gin.Context) {
		rows, err := db.Query(`
			SELECT room_id, name, host
			FROM rooms
			ORDER BY room_id DESC
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch rooms"})
			return
		}
		defer rows.Close()

		rooms := []gin.H{}
		for rows.Next() {
			var roomID, name, host string
			if err := rows.Scan(&roomID, &name, &host); err != nil {
				continue
			}
			rooms = append(rooms, gin.H{
				"room_id": roomID,
				"name":    name,
				"host":    host,
			})
		}

		c.JSON(http.StatusOK, gin.H{"rooms": rooms})
	})

	r.DELETE("/room/delete", func(c *gin.Context) {
		roomID := strings.TrimSpace(c.Query("room_id"))
		if roomID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "room_id query param is required"})
			return
		}

		if _, err := db.Exec(`DELETE FROM rooms WHERE room_id = ?`, roomID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete room"})
			return
		}
		if _, err := db.Exec(`DELETE FROM room_stats WHERE room_id = ?`, roomID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete room"})
			return
		}

		_, _ = rdb.Del(ctx, fmt.Sprintf("leaderboard:%s", roomID)).Result()
		c.JSON(http.StatusOK, gin.H{"status": "deleted", "room_id": roomID})
	})

	r.POST("/comment/create", func(c *gin.Context) {
		var req createCommentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		roomID := strings.TrimSpace(c.Query("room_id"))
		if roomID == "" {
			roomID = strings.TrimSpace(req.RoomID)
		}
		if roomID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "room_id query param is required"})
			return
		}

		userID := strings.TrimSpace(req.UserID)
		if userID == "" {
			userID = "anonymous"
		}
		commentText := strings.TrimSpace(req.Comment)
		if commentText == "" {
			commentText = "comment"
		}

		if _, err := db.Exec(`
			INSERT INTO events (room_id, user_id, type, gift_value)
			VALUES (?, ?, 'comment', 0)
		`, roomID, userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create comment"})
			return
		}

		eventPayload := event.Event{RoomID: roomID, UserID: userID, Type: "comment"}
		go func() {
			if err := kafka.Produce(ctx, eventPayload); err != nil {
				log.Printf("kafka comment produce error: %v", err)
			}
		}()

		c.JSON(http.StatusAccepted, gin.H{
			"status": "queued",
			"comment": gin.H{"room_id": roomID, "comment": commentText},
		})
	})

	r.POST("/flower/send", func(c *gin.Context) {
		var req sendGiftRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		roomID := strings.TrimSpace(c.Query("room_id"))
		if roomID == "" {
			roomID = strings.TrimSpace(req.RoomID)
		}
		if roomID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "room_id query param is required"})
			return
		}

		userID := strings.TrimSpace(req.UserID)
		if userID == "" {
			userID = "anonymous"
		}

		giftValue := req.GiftValue
		if giftValue <= 0 {
			giftValue = req.Count
		}
		if giftValue <= 0 {
			giftValue = 1
		}

		if _, err := db.Exec(`
			INSERT INTO events (room_id, user_id, type, gift_value)
			VALUES (?, ?, 'gift', ?)
		`, roomID, userID, giftValue); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send gift"})
			return
		}

		eventPayload := event.Event{RoomID: roomID, UserID: userID, Type: "gift", GiftValue: giftValue}
		go func() {
			if err := kafka.Produce(ctx, eventPayload); err != nil {
				log.Printf("kafka gift produce error: %v", err)
			}
		}()

		c.JSON(http.StatusAccepted, gin.H{
			"status": "queued",
			"flower": gin.H{"room_id": roomID, "count": giftValue},
		})
	})




	r.POST("/events", func(c *gin.Context) {
		var e event.Event
		if err := c.ShouldBindJSON(&e); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		go func() {
			if err := kafka.Produce(ctx, e); err != nil {
				log.Printf("kafka produce error: %v", err)
			}
		}()

		c.JSON(http.StatusAccepted, gin.H{"status": "queued"})
	})

	r.GET("/rooms/:room_id/stats", func(c *gin.Context) {
		result, err := stats.GetRoomStats(c.Param("room_id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read stats"})
			return
		}
		c.JSON(http.StatusOK, result)
	})

	r.GET("/rooms/:room_id/leaderboard", func(c *gin.Context) {
		users, err := leaderboard.GetTopUsers(ctx, c.Param("room_id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read leaderboard"})
			return
		}
		c.JSON(http.StatusOK, users)
	})

	if err := r.Run(":8087"); err != nil {
		panic(err)
	}
}
