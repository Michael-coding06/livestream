package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"streampulse/cmd/services"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type createRoomRequest struct {
	Name string `json:"name"`
	Host string `json:"host"`
}

func CreateRoom(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createRoomRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		roomName := strings.TrimSpace(req.Name)
		host := strings.TrimSpace(req.Host)
		if roomName == "" || host == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "name and host are required"})
			return
		}

		result, err := db.Exec(`
			INSERT INTO rooms (room_name, host)
			VALUES (?, ?)
		`, roomName, host)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create room"})
			return
		}

		roomID, err := result.LastInsertId()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create room"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"room": gin.H{
				"room_id": roomID,
				"name":    roomName,
				"host":    host,
			},
		})
	}
}

func GetRooms(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.Query(`
			SELECT room_id, room_name, host
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
			var roomID, roomName, host string
			if err := rows.Scan(&roomID, &roomName, &host); err != nil {
				continue
			}
			rooms = append(rooms, gin.H{
				"room_id": roomID,
				"name":    roomName,
				"host":    host,
			})
		}
		if err := rows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch rooms"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"rooms": rooms})
	}
}

func DeleteRoom(db *sql.DB, rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := context.Background()
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
	}
}

func GetRoomStats(stats *services.StatsQuerier) gin.HandlerFunc {
	return func(c *gin.Context) {
		result, err := stats.GetRoomStats(c.Param("room_id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read stats"})
			return
		}
		c.JSON(http.StatusOK, result)
	}
}

func GetRoomLeaderboard(leaderboard *services.LeaderboardQuerier) gin.HandlerFunc {
	return func(c *gin.Context) {
		users, err := leaderboard.GetTopUsers(context.Background(), c.Param("room_id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read leaderboard"})
			return
		}
		c.JSON(http.StatusOK, users)
	}
}
