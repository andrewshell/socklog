# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start Vite dev server (opens /demo/index.html)
pnpm dev:server       # Start WebSocket test server on ws://localhost:8080
pnpm build            # Build library (vite build && tsc)
pnpm typecheck        # Type check only (tsc --noEmit)
pnpm lint             # Run ESLint on src/
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting without writing
```

For local development, run `pnpm dev:server` in one terminal and `pnpm dev` in another.

## Architecture

This is a Lit-based web component library for displaying real-time WebSocket logs.

### Component-Core Pattern

The library separates UI components from business logic:

**Core modules** (`src/core/`):

- `WebSocketClient` - EventTarget-based WebSocket wrapper with auto-reconnect. Exposes `connect()`, `disconnect()`, `send(data)`, and `status`. Emits `statuschange` and `log` events.
- `LogStore` - EventTarget-based state manager. Handles filtering, pausing, and log retention. Emits `logadded`, `filterchange`, `logscleared`, `pausechange` events.

**Components** (`src/components/`):

- `<socklog-viewer>` - Creates its own WebSocketClient and LogStore internally. Uses `@lit-labs/virtualizer` for efficient rendering of large log lists.
- `<socklog-controls>` - Stateless controls that operate on an external LogStore passed via `.store` property.
- `<socklog-sender>` - Textarea + Send button that publishes messages over an external WebSocketClient passed via `.client` property. Reuses the viewer's connection so there's only ever one socket.

The viewer is the connection authority and exposes its internal state to siblings: `getStore()` returns the LogStore (consumed by controls) and `getClient()` returns the WebSocketClient (consumed by sender). Siblings receive these via property injection.

### Build Output

Vite builds three formats with Lit bundled (no external dependencies):

- ESM: `dist/socklog.js`
- CJS: `dist/socklog.cjs`
- UMD: `dist/socklog.umd.js` (global: `Socklog`)

## Code Style

- Single quotes, no semicolons (Prettier handles this)
- 2-space indentation
- Follow `~/.agent-os/standards/code-style.md`

## Releases

This repo uses [release-please](https://github.com/googleapis/release-please) (config: `release-please-config.json`, manifest: `.release-please-manifest.json`, workflow: `.github/workflows/release-please.yml`). On every push to `main`, the action opens or updates a release PR; merging it creates the `vX.Y.Z` tag and a GitHub Release. Publishing to npm is manual (`pnpm publish`).

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) — release-please parses them to determine the next version and build the changelog:

- `feat:` — new feature (bumps patch while pre-1.0, minor after)
- `fix:` — bug fix (bumps patch)
- `feat!:` or `BREAKING CHANGE:` footer — breaking change (bumps minor while pre-1.0, major after)
- `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `ci:`, `build:`, `perf:` — no version bump (most show in changelog under their section)

Do not edit `version` in `package.json` or the manifest manually — release-please owns those.
