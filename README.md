# SyncSpace

SyncSpace is a full-stack, real-time communication platform for remote teams. It combines video meetings, chat, collaborative whiteboarding, file sharing, and AI-assisted meeting support into a single workspace.

## Key features

- JWT-based authentication with protected routes
- Meeting rooms with WebRTC video, screen share, and active speaker indicators
- Real-time chat, hand raise, and participant updates via Socket.io
- Collaborative whiteboard with shared state and history
- Shared meeting notes with live sync
- File uploads with per-room filtering and download links
- AI assistant for meeting summaries and Q and A
- Meeting history and rejoin flow

## Architecture overview

- API server: Express 5 + Socket.io in `artifacts/api-server`
- Frontend: React + Vite in `artifacts/syncspace`
- OpenAPI spec: source of truth in `lib/api-spec`
- Generated client and schemas: `lib/api-client-react`, `lib/api-zod`
- Database access and schema: `lib/db` (Drizzle ORM)
- Mockup sandbox: component preview server in `artifacts/mockup-sandbox`

## Tech stack

- Node.js 24, TypeScript 5.9, pnpm workspaces
- React, Vite, Tailwind CSS, Wouter, Zustand, React Query
- Express 5, Socket.io, simple-peer (WebRTC)
- PostgreSQL with Drizzle ORM
- OpenAPI + Orval for client generation
- Zod for validation
- Groq SDK for AI endpoints

## Repository layout

- `artifacts/api-server` - API server and Socket.io events
- `artifacts/syncspace` - Web application
- `artifacts/mockup-sandbox` - component preview server
- `lib/api-spec` - OpenAPI spec
- `lib/api-client-react` - generated React Query hooks
- `lib/api-zod` - generated Zod schemas
- `lib/db` - database schema and Drizzle config
- `scripts` - workspace utility scripts

## Environment variables

The backend and frontend require explicit environment variables. The repo does not load dotenv by default, so set these in your shell or process manager.

Backend (api-server):
- `DATABASE_URL` (required) - PostgreSQL connection string
- `SESSION_SECRET` (required for production) - JWT signing secret; defaults to `syncspace_secret` if omitted
- `GROQ_API_KEY` (optional) - enables AI endpoints
- `PORT` (required) - HTTP port for the API server
- `LOG_LEVEL` (optional) - logging level for pino

Frontend (syncspace):
- `PORT` (required) - Vite dev server port
- `BASE_PATH` (required) - base path for the app (use `/` for local dev)

Mockup sandbox:
- `PORT` (required) - Vite dev server port
- `BASE_PATH` (required) - base path for the preview server

## Local development

Prerequisites:
- Node.js 24
- pnpm
- PostgreSQL instance for `DATABASE_URL`

Install dependencies:

```
pnpm install
```

Run the API server (two-step dev flow):

```
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

Run the frontend:

```
pnpm --filter @workspace/syncspace run dev
```

Optional: run the mockup sandbox:

```
pnpm --filter @workspace/mockup-sandbox run dev
```

## Common workspace scripts

From the repository root:

- `pnpm run typecheck` - full typecheck across all packages
- `pnpm run build` - typecheck and build all packages
- `pnpm --filter @workspace/api-spec run codegen` - regenerate API client and Zod schemas
- `pnpm --filter @workspace/db run push` - push schema changes with Drizzle

## API and real-time behavior

- REST endpoints are defined in `lib/api-spec/openapi.yaml` and served under `/api`.
- The Socket.io server authenticates with the same JWT used by the REST API.
- WebRTC uses a mesh topology with Google STUN servers.
- File uploads are stored in `artifacts/api-server/uploads` and are limited to 10 MB.

Allowed upload MIME types:
- PDF, PNG, JPG, GIF, WebP
- DOCX, XLSX
- ZIP
- text/plain

## Database schema

Core tables:
- `users`
- `rooms`
- `room_participants`
- `files`

## Production notes

- Set a strong `SESSION_SECRET` and do not rely on the default.
- AI routes return 503 if `GROQ_API_KEY` is not configured.
- The API server rebuilds before start in the provided dev workflow, so restart after code changes.
