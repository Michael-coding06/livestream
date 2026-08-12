# LiveStream Studio

A TikTok-style livestream room simulator built with React + TypeScript + Vite.

## Features

### Admin mode
- Dashboard showing all 6 live rooms with real-time stats
- Viewer counts, comments, gifts, and revenue update every 1.8 seconds
- Click any room card to enter it as a user

### User mode — Room browser
- Browse all live rooms with hover effects
- Click to enter any room

### User mode — Live room
- TikTok-style comment overlay (bottom-left)
- Gift toasts (bottom-right) that auto-dismiss after 3.5 seconds
- Other users' comments and gifts simulate in real time
- Quick-send gift chips: Rose, Star, Crown, Rocket, Diamond, Galaxy
- Comment input with Enter key support
- ❤️ Like button

## Getting started

```bash
npm install
npm run dev
```

## Project structure

```
src/
  types/        # TypeScript interfaces (Room, RoomStats, ChatMessage, etc.)
  data/         # Static data + utility functions
  hooks/
    useRoomStats.ts   # Global stats simulation for all rooms
    useLiveRoom.ts    # Per-room chat + gift toast simulation
  components/
    AdminView.tsx     # Admin dashboard with room grid + summary cards
    RoomBrowser.tsx   # User-facing room picker
    LiveRoom.tsx      # Full live room experience
    ChatOverlay.tsx   # Floating comment bubbles
    GiftOverlay.tsx   # Gift toast notifications
    UserView.tsx      # Switches between browser and live room
  App.tsx             # Root: mode toggle + routing
  main.tsx            # React entry point
```

## Tech stack

- React 18 + TypeScript (strict mode)
- Vite for fast HMR
- Zero external UI libraries — all styling via inline styles + CSS custom properties
