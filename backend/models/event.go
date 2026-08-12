package event

type Event struct {
	RoomID    string `json:"room_id"`
	UserID    string `json:"user_id"`
	Type      string `json:"type"`
	GiftValue int    `json:"gift_value"`
}
