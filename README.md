# RandomTalk

## Features
- Home page with country/gender filters
- Video chat page with WebRTC peer-to-peer video/audio
- Text chat, Next, Stop
- Backend matchmaking queue + WebRTC signaling relay over WebSocket
- REST endpoints: `GET /api/`, `GET /api/stats`

## Prereqs
- Node.js 20+

## Run locally

Install deps (from repo root):

```bash
npm install
```

Start backend + frontend together:

```bash
npm run dev
```

- Frontend: `http://localhost:5173` (or the next available port if busy)
- Backend: `http://localhost:8080`
- WebSocket endpoint (backend): `ws://localhost:8080/api/ws`

## Quick test (matching)
1. Open the frontend URL in **two tabs** (or two different browsers).
2. In both tabs: click **Start**.
3. You should see **Partner found** in both tabs.
4. Type a chat message in one tab → it should appear in the other.
5. Click **Next** to skip and re-queue.

You can also watch live state in `http://localhost:8080/api/stats` (connections, queue size, active sessions).

## Environment (optional)

- `PORT` (server): default `8080`
- `CLIENT_ORIGIN` (server CORS): default `*`
- `VITE_WS_URL` (client): set to a full WS base URL like `ws://localhost:8080` or `wss://your-domain`

## Dev proxy note
During development, the Vite dev server proxies `/api/*` (including WebSockets) to `http://localhost:8080`.
This keeps the client URL stable even if Vite switches from port 5173 to 5174/5175.

