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

func NewLeaderboardQuerier(rdb *redis.Client) *LeaderboardQuerier {
	return &LeaderboardQuerier{rdb: rdb}
}

func (l *LeaderboardQuerier) GetTopUsers(ctx context.Context, roomID string) ([]redis.Z, error) {
	key := fmt.Sprintf("leaderboard:%s", roomID)
	return l.rdb.ZRevRangeWithScores(ctx, key, 0, 9).Result()
}

func (l *LeaderboardQuerier) UpdateLeaderboard(ctx context.Context, e event.EventPayload, giftValue int) {
	// if e.Type != "gift" {
	// 	return
	// }
	fmt.Println("The update at the redis has been called")
	score := float64(giftValue)
	if score <= 0 {
		score = 1
	}

	key := fmt.Sprintf("leaderboard:%d", e.RoomID)
	if err := l.rdb.ZIncrBy(ctx, key, score, strconv.Itoa(e.UserID)).Err(); err != nil {
		log.Printf("leaderboard update error: %v\n", err)
	}
}
