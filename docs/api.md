# Blackout Socket.IO API

Namespace: `/g/blackout`

## Client -> Server Events

All callback responses follow:

- success: `{ ok: true, ... }`
- error: `{ ok: false, error: string }`

### Lobby and Session

#### `createRoom`

```ts
createRoom(data: { name: string }, cb)
```

Response:

```ts
{
  ok: true;
  roomCode: string;
  playerId: string;
  resumeToken: string;
}
```

#### `joinRoom`

```ts
joinRoom(data: { name: string; code: string }, cb)
```

Response:

```ts
{
  ok: true;
  playerId: string;
  resumeToken: string;
}
```

#### `autoJoinRoom`

```ts
autoJoinRoom(data: { sessionId: string; playerId: string; name: string }, cb)
```

Response:

```ts
{
  ok: true;
  roomCode: string;
  playerId: string;
  resumeToken: string;
}
```

#### `resumePlayer`

```ts
resumePlayer(data: { roomCode: string; playerId: string; resumeToken: string }, cb)
```

Response:

```ts
{
  ok: true;
}
```

#### `leaveRoom`

```ts
leaveRoom(data: { roomCode: string; playerId: string })
```

No callback.

### Host Config (Lobby)

#### `updateMaxRounds`

```ts
updateMaxRounds(data: { roomCode: string; playerId: string; maxRounds: number })
```

No callback. Host only, lobby phase only.

#### `updateRoomSettings`

```ts
updateRoomSettings(data: {
  roomCode: string;
  playerId: string;
  language: 'de' | 'en';
  excludedLetters: string[];
})
```

No callback. Host only, lobby phase only.

#### `startGame`

```ts
startGame(data: { roomCode: string; playerId: string }, cb)
```

Response:

```ts
{
  ok: true;
}
```

### Gameplay

#### `revealCategory`

```ts
revealCategory(data: { roomCode: string; playerId: string })
```

Reader only. Reveals prompt to all players and starts timer.

#### `buzz`

```ts
buzz(data: { roomCode: string; playerId: string })
```

Adds player to buzzer order if round is open and player has not buzzed yet.

#### `selectWinner`

```ts
selectWinner(data: { roomCode: string; playerId: string; winnerId: string })
```

Reader only. `winnerId` must exist in current `buzzerOrder`.

#### `skipRound`

```ts
skipRound(data: { roomCode: string; playerId: string })
```

Reader only. Finalizes round without winner.

### Meta

#### `restartGame`

```ts
restartGame(data: { roomCode: string; playerId: string })
```

Host only. Resets scores and returns room to lobby.

#### `requestState`

```ts
requestState(data: { roomCode: string; playerId: string })
```

Sends a `roomUpdate` to that specific player if valid.

## Server -> Client Events

### `roomUpdate`

```ts
roomUpdate(room: RoomView)
```

Per-player sanitized room state.

Important fields in current `RoomView`:

- `language: 'de' | 'en'`
- `excludedLetters: string[]`
- `currentRound.task`
- `currentRound.letter` (`string | null`)

Before reveal, non-readers receive:

- `currentRound.category = null`
- `currentRound.task = null`
- `currentRound.letter = null`

### `buzzerAlert`

```ts
buzzerAlert()
```

Fired when a valid buzz is registered.

## Room Lifecycle

1. Player creates/joins room (`createRoom`/`joinRoom`) or embedded auto-joins (`autoJoinRoom`).
2. Host can set rounds and room settings (`updateMaxRounds`, `updateRoomSettings`).
3. Host starts game (`startGame`).
4. Reconnect uses `resumePlayer` + `resumeToken`.
5. Leave/disconnect updates player connectivity and host assignment.

## Gameplay Lifecycle

1. `startGame` creates round and picks reader.
2. Reader initially sees prompt: category + task + optional letter.
3. Reader emits `revealCategory`; server opens buzzer and starts timer.
4. Players emit `buzz`; server keeps ordered list and emits `buzzerAlert`.
5. Reader emits `selectWinner` or `skipRound`.
6. Server finalizes round, updates scores, transitions phase.
7. After `maxRounds`, phase transitions to `ended`.

## Error Handling

- Callback-based events return `{ ok: false, error }` on validation/permission/state errors.
- Common error types:
  - room/player not found
  - invalid input
  - invalid resume token
  - host-only or reader-only violations
  - wrong game phase for requested action

Example:

```ts
{ ok: false, error: 'Room not found' }
```

