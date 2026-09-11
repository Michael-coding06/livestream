package services

import (
	"context"
	"fmt"
	"log"
	"strconv"

	event "streampulse/models"

	"github.com/redis/go-redis/v9"
)

type LeaderboardQuerier struct {
	rdb *redis.Client
}

type LeaderboardEntry struct {
	RoomID        int     `json:"room_id"`
	UserID        int     `json:"user_id"`
	UserName      string  `json:"user_name"`
	DonationValue float64 `json:"donation_value"`
}

func NewLeaderboardQuerier(rdb *redis.Client) *LeaderboardQuerier {
	return &LeaderboardQuerier{rdb: rdb}
}

func (l *LeaderboardQuerier) GetTopUsers(ctx context.Context, roomID int) ([]LeaderboardEntry, error) {
	key := fmt.Sprintf("room:%d:donations", roomID)
	users, err := l.rdb.ZRevRangeWithScores(ctx, key, 0, 9).Result()
	if err != nil {
		return nil, err
	}

	entries := make([]LeaderboardEntry, 0, len(users))
	for _, user := range users {
		userName, ok := user.Member.(string)
		if !ok {
			continue
		}

		entries = append(entries, LeaderboardEntry{
			RoomID:        roomID,
			UserID:        -1,
			UserName:      userName,
			DonationValue: user.Score,
		})
	}

	return entries, nil
}

func (l *LeaderboardQuerier) UpdateLeaderboard(ctx context.Context, e event.EventPayload, giftValue int) {
	if e.Type != "gift" {
		return
	}

	fmt.Println("The update at the redis has been called")
	score := float64(giftValue)
	if score <= 0 {
		score = 1
	}

	key := fmt.Sprintf("room:%d:donations", e.RoomID)
	member := e.UserName
	if member == "" {
		member = strconv.Itoa(e.UserID)
	}
	if err := l.rdb.ZIncrBy(ctx, key, score, member).Err(); err != nil {
		log.Printf("leaderboard update error: %v\n", err)
	}
}
