# Game Hub Integration

This document explains how to package and run Blackout inside Game Hub, and how that differs from standalone mode.

## Transform Script

Run the transform script from repository root:

```bash
node scripts/transform-for-gamehub.mjs
```

This creates `game-export/blackout` in a Game Hub-style package layout.

## Transform Output Structure

```text
game-export/blackout/
+-- web/
|   +-- src/          # copied from ui-vue/src
|   +-- package.json
+-- server/
|   +-- src/          # copied from server/src
|   +-- package.json
+-- shared/
    +-- src/          # copied from core/src
    +-- package.json
```

## Import Rewrites Performed

The transform rewrites shared imports in copied `.ts`/`.vue` files:

- `@shared/*` -> `@game-hub/blackout-shared/*`
- `../../core/src/*` -> `@game-hub/blackout-shared/*`
- `../../../core/src/*` -> `@game-hub/blackout-shared/*`
- `../../../../core/src/*` -> `@game-hub/blackout-shared/*`

## Hub Integration Props

`ui-vue/src/types/config.ts` defines runtime props expected in embedded mode.

| Prop          | Type     | Purpose                                                       |
| ------------- | -------- | ------------------------------------------------------------- |
| `sessionId`   | `string` | Hub party/session identifier used for `autoJoinRoom` mapping |
| `joinToken`   | `string` | Handshake token passed via Socket.IO auth                    |
| `wsNamespace` | `string` | Namespace path (for Blackout: `/g/blackout`)                 |
| `apiBaseUrl`  | `string` | Optional base URL when hub serves API on another origin/path |
| `playerId`    | `string` | Stable hub player id                                         |
| `playerName`  | `string` | Display name used inside game                                |

## Auto-Join (Embedded) vs Standalone Flow

### Embedded (Game Hub)

- `wsNamespace` is set
- landing page is skipped
- client emits `autoJoinRoom({ sessionId, playerId, name })`
- server resolves or creates room via `sessionId -> roomCode` mapping

### Standalone

- `wsNamespace` is undefined
- landing page shows create/join inputs
- client uses `createRoom` / `joinRoom`
- room code sharing is done by players directly

## Library Build

For Game Hub web integration, build the library bundle:

```bash
pnpm build:lib
```

Current library entrypoint:

- `ui-vue/src/index.ts`

Exports:

- `manifest`
- `GameComponent`
- shared event/type exports for host-side typing

## CI Integration Workflow

Workflow file:

- `.github/workflows/integrate-to-gamehub.yml`

The integration job is intentionally disabled by default.  
Set repository variable `ENABLE_BLACKOUT_GAMEHUB_INTEGRATION=true` to activate it.

## Integration Checklist

1. Build and verify locally (`pnpm typecheck`, `pnpm lint`, `pnpm test`).
2. Generate export (`node scripts/transform-for-gamehub.mjs`).
3. Copy `game-export/blackout` into the Game Hub game registry location.
4. Ensure host mounts `GameComponent` with required embedded props.
5. Ensure server registers namespace `/g/blackout`.
6. Validate reconnect behavior using `resumeToken` and `autoJoinRoom`.
