package handlers

import (
	"context"
	"database/sql"
	"log"
	"strings"

	"streampulse/cmd/services"
	event "streampulse/models"

	"github.com/gin-gonic/gin"
)

type createCommentRequest struct {
	Comment  string `json:"comment"`
	RoomID   int    `json:"roomID"`
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
}

type sendGiftRequest struct {
	RoomID    int    `json:"roomID"`
	UserName  string `json:"user_name"`
	Count     int    `json:"count"`
	GiftValue int    `json:"gift_value"`
}

func CreateComment(kafka *services.KafkaProducer) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		var req createCommentRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		roomID := req.RoomID
		userID := req.UserID
		commentText := strings.TrimSpace(req.Comment)
		if commentText == "" {
			commentText = "comment"
		}
		username := strings.TrimSpace(req.Username)
		if username == "" {
			username = "anonymous"
		}

		eventPayload := event.EventPayload{
			RoomID:   roomID,
			UserID:   userID,
			Type:     "comment",
			Content:  commentText,
			UserName: username,
		}

		go func() {
			if err := kafka.Produce(ctx, eventPayload); err != nil {
				log.Printf("kafka comment produce error: %v", err)
			}
		}()

		c.JSON(202, gin.H{
			"status":  "queued",
			"comment": gin.H{"room_id": roomID, "comment": commentText, "username": username},
		})
	}
}

func SendFlower(db *sql.DB, kafka *services.KafkaProducer) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
		var req sendGiftRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		roomID := req.RoomID
		userName := strings.TrimSpace(req.UserName)
		if roomID <= 0 || userName == "" {
			c.JSON(400, gin.H{"error": "roomID and user_name are required"})
			return
		}
		giftValue := req.GiftValue
		if giftValue <= 0 {
			giftValue = req.Count
		}
		if giftValue <= 0 {
			giftValue = 1
		}

		// Fake cash handler / cash api
		log.Printf("Cash handler on processing donation on room: %d, by user: %s, count: %d\n", roomID, userName, giftValue)
		log.Printf("Donation handler successfully")

		if _, err := db.Exec(`
			INSERT INTO events (room_id, user_name, type, gift_value)
			VALUES (?, ?, 'gift', ?)
		`, roomID, userName, giftValue); err != nil {
			c.JSON(500, gin.H{"error": "failed to send gift"})
			return
		}

		eventPayload := event.EventPayload{
			RoomID:    roomID,
			UserName:  userName,
			Type:      "gift",
			GiftValue: giftValue,
			Content:   "",
		}

		if err := kafka.Produce(ctx, eventPayload); err != nil {
			log.Printf("kafka gift produce error: %v", err)
			c.JSON(500, gin.H{
				"status": "donation_failed",
			})
			return
		}

		c.JSON(202, gin.H{
			"status": "queued",
			"flower": gin.H{"room_id": roomID, "count": giftValue},
		})
	}
}
