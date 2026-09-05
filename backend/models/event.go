package event

// Event acts as the base envelope for all Kafka messages
type EventPayload struct {
	RoomID    int    `json:"room_id"`
	UserID    int    `json:"user_id"`
	Type      string `json:"type"`
	GiftValue int    `json:"gift_value"`
	Content   string `json:"content"`
	UserName  string `json:"username"`
}

type CommentPayload struct {
	RoomID int    `json:"room_id"`
	UserID int    `json:"user_id"`
	Type   string `json:"type"`
}
