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
|   +-- tsconfig.json
+-- server/
|   +-- src/          # copied from server/src
|   +-- package.json
|   +-- tsconfig.json
|   +-- tsconfig.build.json
|   +-- tsup.config.ts
+-- shared/
    +-- src/          # copied from core/src
    +-- package.json
    +-- tsconfig.json
    +-- tsconfig.build.json
    +-- tsup.config.ts
+-- README.md
```

Additional generated files:

- `server/src/index.ts` (Game Hub plugin entry: `definition`, `register`, `handler`)
- `shared/src/index.ts` (barrel export)

The transform also removes local SQLite runtime files (`blackout.sqlite*`) from the export.

## Import Rewrites Performed

The transform rewrites shared imports in copied `.ts`/`.vue` files:

- `@shared/*` -> `@game-hub/blackout-shared/*`
- `../../core/src/*` -> `@game-hub/blackout-shared/*`
- `../../../core/src/*` -> `@game-hub/blackout-shared/*`
- `../../../../core/src/*` -> `@game-hub/blackout-shared/*`

## Hub Integration Props

`ui-vue/src/types/config.ts` defines runtime props expected in embedded mode.

| Prop          | Type     | Purpose                                                      |
| ------------- | -------- | ------------------------------------------------------------ |
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

## Game Hub Registry Changes

After copying `game-export/blackout` to `game-hub/games/blackout`, register the game in both registries:

1. Server registry (`game-hub/apps/platform-server/src/index.ts`)
   - import `handler` from `@game-hub/blackout-server`
   - call `registerGame(blackoutHandler)`
2. Web registry (`game-hub/apps/platform-web/src/gameRegistry.ts`)
   - import game UI from `@game-hub/blackout-web`
   - call `registerGameUI(...)` with definition `{ id: 'blackout', ... }`

Without these two steps, the game package is present in the monorepo but not selectable/runnable in the platform UI.

## Integration Checklist

1. Build and verify locally:
   - `pnpm typecheck` (Checks strict TypeScript rules needed for Game Hub)
   - `pnpm lint` (Runs ESLint; fix errors beforehand to prevent CI failures)
   - `pnpm test` and `pnpm test:e2e`
2. Generate export (`node scripts/transform-for-gamehub.mjs`).
3. Copy `game-export/blackout` into the Game Hub game registry location.
4. Register blackout in server + web game registries.
5. Ensure host mounts `GameComponent` with required embedded props.
6. Ensure server registers namespace `/g/blackout`.
7. Validate reconnect behavior using `resumeToken` and `autoJoinRoom`.
