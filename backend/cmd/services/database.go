package services

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	event "streampulse/models"
)

type RoomStats struct {
	RoomID   string `json:"room_id"`
	Comments int64  `json:"comments"`
	Likes    int64  `json:"likes"`
	Gifts    int64  `json:"gifts"`
	Joins    int64  `json:"joins"`
}

type StatsQuerier struct {
	db *sql.DB
}

func NewStatsQuerier(db *sql.DB) *StatsQuerier {
	return &StatsQuerier{db: db}
}

func (s *StatsQuerier) GetRoomStats(roomID string) (*RoomStats, error) {
	stats := &RoomStats{RoomID: roomID}

	err := s.db.QueryRow(`
		SELECT comments, likes, gifts, joins
		FROM room_stats
		WHERE room_id = ?
	`, roomID).Scan(&stats.Comments, &stats.Likes, &stats.Gifts, &stats.Joins)

	if errors.Is(err, sql.ErrNoRows) {
		return stats, nil
	}

	if err != nil {
		return nil, err
	}

	return stats, nil
}

func (s *StatsQuerier) UpdateStats(e event.Event) {
	column := statColumn(e.Type)
	if column == "" {
		return
	}
	
	fmt.Print("The update stats is called")
 
	query := fmt.Sprintf(`
		INSERT INTO room_stats (room_id, %s)
		VALUES (?, 1)
		ON DUPLICATE KEY UPDATE %s = %s + 1
	`, column, column, column)
 
	_, err := s.db.Exec(query, e.RoomID)
	if err != nil {
		log.Printf("update stats error: %v\n", err)
	}
}

func statColumn(eventType string) string {
	switch eventType {
	case "comment":
		return "comments"
	case "like":
		return "likes"
	case "gift":
		return "gifts"
	case "join":
		return "joins"
	default:
		return ""
	}
}