# SyncSpace

A full-stack real-time video conferencing and collaboration platform for remote teams.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/syncspace run dev` — run the frontend (port 20029, proxied at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

Required env vars:
- `DATABASE_URL` — Postgres connection string
- `SESSION_SECRET` — JWT signing secret
- `GROQ_API_KEY` — Groq API key for AI assistant

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Wouter, Zustand, React Query, Framer Motion
- Backend: Express 5, Socket.io (real-time)
- WebRTC: simple-peer (mesh topology, Google STUN)
- Whiteboard: fabric.js (collaborative canvas)
- DB: PostgreSQL + Drizzle ORM
- AI: Groq llama3-8b-8192
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/` — Express + Socket.io backend
- `artifacts/api-server/src/routes/` — auth, rooms, files, AI, health
- `artifacts/api-server/src/socket/` — Socket.io event handlers
- `artifacts/api-server/uploads/` — uploaded files (multer)
- `artifacts/syncspace/` — React + Vite frontend
- `artifacts/syncspace/src/pages/` — login, register, dashboard, room, whiteboard, files, settings
- `artifacts/syncspace/src/store/` — Zustand stores (auth, socket)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — generated React Query hooks + Zod schemas
- `lib/db/` — Drizzle schema + migration config

## Architecture decisions

- JWT stored in `localStorage` as `syncspace_token`; injected via `setAuthTokenGetter` from `@workspace/api-client-react`
- Socket.io connects to `window.location.origin` with auth token in handshake
- WebRTC mesh: existing peers initiate offers, new peer answers; STUN: `stun:stun.l.google.com:19302`
- `nanoid(8)` for short room IDs
- File uploads: multer, max 10MB, stored in `uploads/` with UUID filenames
- Whiteboard events debounced 100ms before socket emit to avoid flooding
- `global: "globalThis"` defined in Vite config for simple-peer Node.js compat
- The meeting room page always uses dark theme regardless of global theme toggle

## Product

- **Auth**: JWT register/login/logout with protected routes
- **Dashboard**: Create/join meetings, recent meeting history
- **Meeting Room**: WebRTC video grid (up to 8 tiles), mic/camera/screen-share toggles, raise hand, floating pill controls bar
- **Real-time Chat**: Socket.io messages, file attachment via paperclip button
- **Collaborative Whiteboard**: fabric.js canvas synced via Socket.io, pen/shapes/eraser/undo/redo/download
- **File Sharing**: Upload and list files with download links
- **AI Assistant**: Groq llama3-8b-8192 for meeting summaries and Q&A
- **Settings**: User profile info, dark/light mode toggle

## User preferences

- No emojis in UI text
- Dark-first design: deep indigo/navy (#0F1117 bg, #1A1D2E surface, #6366F1 primary)

## Gotchas

- API server does `pnpm run build` then `pnpm run start` on each dev start — always restart after code changes
- `simple-peer` emits harmless `events`/`util` browser externalization warnings in Vite — these don't affect WebRTC functionality
- File download URL format: `/api/files/:fileId/download`
- Socket.io path `/socket.io` is included in `artifact.toml` paths for proxy routing

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
