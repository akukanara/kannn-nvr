# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open-source Network Video Recorder (NVR) with object detection. Monitors IP security cameras, continuously records feeds to disk, and serves a web UI for live viewing and motion event review. Uses ffmpeg for streaming, a Python-based ML detector for object tagging, and LevelDB for persistence.

## Development Commands

This project uses **pnpm** + **Turborepo** as a monorepo. Install dependencies with `pnpm install`.

### Legacy Frontend (React + Vite)
- `pnpm dev:legacy` — Start Vite dev server on :3000 (proxies API routes to backend :8080)
- `pnpm --filter @nvr/legacy-frontend build` — Build SPA to `apps/legacy-frontend/build/`
- `pnpm --filter @nvr/legacy-frontend preview` — Preview production build

### Dashboard (Next.js + Chakra UI)
- `pnpm dev:dashboard` — Start Next.js dev server on :3000
- `pnpm --filter @nvr/dashboard build` — Build for production (`output: 'standalone'`)
- `pnpm --filter @nvr/dashboard start` — Start production server
- Re-proxies `/api/*`, `/video/*`, `/image/*`, `/mp4/*` to the NVR backend

### Backend (TypeScript / Node)
- `pnpm --filter @nvr/server build` — Compile server TypeScript to `apps/server/lib/`
- `pnpm server` — Run compiled server (or `node apps/server/lib/server/index.js`)
- Server listens on port 8080 by default (override with `PORT` env var)
- Database path defaults to `./mydb` relative to execution cwd (override with `DBPATH`)
- Log level defaults to `info` (override with `LOG_LEVEL` env var)

### Tests
- `pnpm test` — Run all workspace tests via Turborepo
- `pnpm --filter @nvr/server test` — Run server tests (`vitest run`)
- `pnpm --filter @nvr/server test:watch` — Run tests in watch mode
- Tests are integration-style and spawn real server instances via `createServer()` from `server/index.ts`
- Tests use `port: 0` (random port) and `registerSignalHandlers: false`
- Default timeout: 60s per test, 30s per hook

### Object Detection (Python)
- Located in `apps/ai/` — Python module with ONNX and RKNN inference support
- `apps/ai/detector/detect.py` — Main detection entry point
- `apps/ai/detector/detect_stub.py` — Stub detector for testing (no OpenCV/ONNX deps)
- Install with `pip install -e apps/ai/` (see `apps/ai/pyproject.toml` for dependencies)

## Architecture

### Legacy Frontend (`apps/legacy-frontend/src/`)

React SPA (JSX, not TypeScript). Built with Vite. Key files:
- `src/App.jsx` — Main app shell, routing, camera grid, video player
- `src/PanelSettings.jsx` — Settings panel (disk, cameras, detection config)
- `src/PanelStats.jsx` — Stats/metrics panel

The app uses `@fluentui/react-components` for UI. Deep linking is implemented via URL hash for movement playback and images.

### Dashboard (`apps/dashboard/`)

Next.js 15 App Router + Chakra UI v3 + React Query + Zustand. Features:
- Live camera grid with hls.js playback
- Movement event browser with playback overlay
- System statistics and settings panels
- Dark/light mode toggle via custom color mode provider
- API proxying to the NVR backend via Next.js rewrites

### Backend (`apps/server/server/`)

Koa-based HTTP server with a control-loop architecture.

**`index.ts`** — Application bootstrap. Creates the server programmatically via `createServer(config)`. Wires together:
- LevelDB database and sublevels (`cameras`, `movements`, `settings`, `diskstatus`)
- In-memory caches (`_inmem_cameraCache`, `_inmem_settingsCache`)
- Control loop and disk cleanup loop intervals
- Graceful shutdown with process termination and SSE cleanup
- On startup, recovers any movements stuck in `processing` state back to `pending`

**`www.ts`** — HTTP routes, DB types, and utility functions. Defines REST API for:
- `/api/settings` — Get/update app settings
- `/api/cameras` — CRUD for camera config
- `/api/movements` — List/query motion events
- `/api/movement/:key/*` — HLS playlist and segment serving
- `/api/sse` — Server-Sent Events for live movement updates
- `/metrics` — Prometheus metrics endpoint

**`processor.ts`** — Core control loop. Runs every 1 second via `runControlLoop()`. Manages:
- `controllerDetector()` — ML detection process lifecycle (with scheduled restart to prevent memory leaks)
- `controllerFFmpeg()` — Starts/stops per-camera ffmpeg streaming processes
- `controllerFFmpegConfirmation()` — Verifies streams are producing output
- `detectCameraMovement()` — Polls camera motion APIs
- `triggerProcessMovement()` — Extracts frames from motion events and sends to ML detector
- `clearDownDisk()` — Removes oldest segments when disk is near capacity
- `sseKeepAlive()` — SSE connection health

All in-memory process state is prefixed with `_inmem_`. Persistent state belongs in LevelDB.

**`process-utils.ts`** — Process spawning and stream pipeline utilities. `spawnProcess()` registers all child processes globally for cleanup tracking.

**`sse-manager.ts`** — SSE broadcast manager. Movements are formatted with `formatMovementForSSE()` before broadcast.

**`diskcheck.ts`** — Disk usage monitoring (spawns `df` and `ls`) and old file deletion.

**`metrics.ts`** — Prometheus metrics using `prom-client`. All metrics prefixed with `nvr_`.

### Database Schema (LevelDB)

- `cameras:<key>` — Camera config (`CameraEntry`)
- `movements:<timestamp>` — Motion event records (`MovementEntry`)
- `settings:config` — App settings (`Settings`)
- `diskstatus:<date>` — Daily disk usage snapshots

Movement keys are zero-padded 12-digit timestamps (seconds since `MOVEMENT_KEY_EPOCH`).

## Coding Principles (from `.github/copilot-instructions.md`)

- Prefer functional programming. Minimize boilerplate and unnecessary abstraction. If a function can be multi-purpose, use parameters rather than duplicate code.
- Target Node 22+ and latest TypeScript. Prefer modern language features and module systems.
- Use classes only where they make clear sense. No dependency injection.
- Use control loops for desired-state management (reliability over event-driven).
- For async processing, use a pointer-based system: caller writes work to a time-ordered log, processor loops check for work and increment a pointer. Include a trigger to wake the loop early when new work arrives.
- Persist state across restarts in the database. Process/fork state can stay in memory, but name it clearly (prefix with `_inmem_`).

## Important Notes

- The server spawns many child processes (ffmpeg for each camera, ffmpeg for movement extraction, Python ML detector). Process cleanup is critical — always use the registry and graceful shutdown paths.
- Movement processing is stateful (`pending` → `processing` → `completed`/`failed`). The server recovers stuck `processing` movements on startup.
- The ML detector process is proactively restarted on a schedule (default 1am) to prevent memory leaks.
- Frontend source is JSX (not TSX), but the backend is fully TypeScript.
- `noUnusedParameters: true` in tsconfig — unused parameters must be prefixed with `_`.
