package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

// We need an Upgrader to turn a normal HTTP request into a WebSocket
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // WARNING: In production, check the actual origin!
	},
}

func StreamChatWS(rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		roomID := c.Param("room_id")

		log.Printf("roomId ows ows: %s", roomID)

		// 1. Upgrade the HTTP connection to a WebSocket
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("Failed to upgrade websocket: %v", err)
			return
		}
		defer conn.Close()

		ctx := context.Background()

		// --------------------------------------------------------
		// Phase 1: Fetch and send the chat history (Hot Storage)
		// --------------------------------------------------------

		// read the history messages list
		commentListKey := fmt.Sprintf("room:%s:comments", roomID)

		// Fetch all items from the list (0 to -1 means all items)
		historyComments, err := rdb.LRange(ctx, commentListKey, 0, -1).Result()
		if err == nil && len(historyComments) > 0 {
			// Because we used LPUSH, the newest messages are at index 0.
			// We iterate backward to send the oldest messages first so they appear in correct order.
			for i := len(historyComments) - 1; i >= 0; i-- {
				if err := conn.WriteMessage(websocket.TextMessage, []byte(historyComments[i])); err != nil {
					log.Printf("Error sending history: %v", err)
					return // Stop if the user disconnected immediately
				}
			}
		}

		donationListKey := fmt.Sprintf("room:%s:donations", roomID)
		leaderboard, err := rdb.LRange(ctx, donationListKey, 0, -1).Result()
		if err == nil && len(leaderboard) > 0 {
			if err := conn.WriteMessage(websocket.TextMessage, []byte(leaderboard[0])); err != nil {
				log.Printf("Error sending history: %v", err)
				return // Stop if the user disconnected immediately
			}
		}

		// --------------------------------------------------------
		// Phase 2: Subscribe to Live Updates (Pub/Sub)
		// --------------------------------------------------------
		pubsubChannel := fmt.Sprintf("room:%s:live", roomID)
		pubsub := rdb.Subscribe(ctx, pubsubChannel)
		defer pubsub.Close() // ALWAYS close the subscription when the user leaves

		redisLiveStream := pubsub.Channel()

		// --------------------------------------------------------
		// Phase 3: The Connection Loops
		// --------------------------------------------------------

		// We need a background gorouti+ne to detect if the user closes their browser tab.
		// If we don't read from the connection, we won't know they left.
		clientGone := make(chan struct{})
		go func() {
			for {
				// We just read and discard any messages the client sends here.
				// (In this app, clients send comments via HTTP POST, not through the WS)
				_, _, err := conn.ReadMessage() // if client is still connected
				if err != nil {
					close(clientGone) // Signal that the client disconnected
					return
				}
			}
		}()

		// Main loop: Wait for new Redis messages OR client disconnects
		for {
			select {
			case msg := <-redisLiveStream:
				log.Printf("new message arrived")

				// A new comment arrived in Redis! Send it to this user's browser.
				err := conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
				if err != nil {
					log.Printf("Failed to push live message: %v", err)
					return // Exit the loop and close connection
				}

			case <-clientGone:
				// The background goroutine detected the user closed the tab
				log.Printf("User disconnected from room: %s", roomID)
				return // Exit the loop, defer blocks will clean up everything
			}
		}
	}
}
