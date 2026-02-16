import type { Room } from '../core/src/types';

// Mock the categoryManager since it requires SQLite
jest.mock('../server/src/managers/categoryManager', () => ({
  getUnusedPrompt: () => ({
    category: { id: 1, name: 'An animal' },
    task: { id: 1, text: 'Starts with letter {letter}', requiresLetter: true },
    letter: 'A',
  }),
}));

import {
  startNewRound,
  revealCategory,
  handleBuzz,
  selectWinner,
  finalizeRound,
  getNextReader,
  getRandomReader,
  isLastRound,
} from '../server/src/managers/roundManager';

function makeRoom(): Room {
  return {
    code: 'TEST',
    hostId: 'p1',
    phase: 'playing',
    players: {
      p1: {
        id: 'p1',
        name: 'Alice',
        resumeToken: 'tok1',
        score: 0,
        connected: true,
        isHost: true,
        socketId: 's1',
        hasBuzzed: false,
      },
      p2: {
        id: 'p2',
        name: 'Bob',
        resumeToken: 'tok2',
        score: 0,
        connected: true,
        isHost: false,
        socketId: 's2',
        hasBuzzed: false,
      },
      p3: {
        id: 'p3',
        name: 'Carol',
        resumeToken: 'tok3',
        score: 0,
        connected: true,
        isHost: false,
        socketId: 's3',
        hasBuzzed: false,
      },
    },
    language: 'de',
    excludedLetters: ['Q', 'X', 'Y'],
    maxRounds: 10,
    currentRound: null,
    roundHistory: [],
    usedCategoryLetterPairs: new Set(),
  };
}

describe('roundManager', () => {
  test('startNewRound creates a round with correct reader', () => {
    const room = makeRoom();
    startNewRound(room, 'p1');
    expect(room.currentRound).not.toBeNull();
    expect(room.currentRound!.readerId).toBe('p1');
    expect(room.currentRound!.buzzerState).toBe('waiting');
    expect(room.currentRound!.revealed).toBe(false);
    expect(room.currentRound!.roundNumber).toBe(1);
  });

  test('revealCategory sets revealed and opens buzzer', () => {
    const room = makeRoom();
    startNewRound(room, 'p1');
    revealCategory(room);
    expect(room.currentRound!.revealed).toBe(true);
    expect(room.currentRound!.buzzerState).toBe('open');
    expect(room.currentRound!.timerEnd).toBeGreaterThan(Date.now());
  });

  test('handleBuzz adds player to buzzer order', () => {
    const room = makeRoom();
    startNewRound(room, 'p1');
    revealCategory(room);

    const result = handleBuzz(room, 'p2');
    expect(result).toBe(true);
    expect(room.currentRound!.buzzerOrder).toEqual(['p2']);
    expect(room.players.p2.hasBuzzed).toBe(true);
  });

  test('handleBuzz prevents reader from buzzing', () => {
    const room = makeRoom();
    startNewRound(room, 'p1');
    revealCategory(room);

    const result = handleBuzz(room, 'p1');
    expect(result).toBe(false);
  });

  test('handleBuzz prevents double buzz', () => {
    const room = makeRoom();
    startNewRound(room, 'p1');
    revealCategory(room);

    handleBuzz(room, 'p2');
    const result = handleBuzz(room, 'p2');
    expect(result).toBe(false);
    expect(room.currentRound!.buzzerOrder).toEqual(['p2']);
  });

  test('selectWinner locks the round', () => {
    const room = makeRoom();
    startNewRound(room, 'p1');
    revealCategory(room);
    handleBuzz(room, 'p2');
    selectWinner(room, 'p2');
    expect(room.currentRound!.winnerId).toBe('p2');
    expect(room.currentRound!.buzzerState).toBe('locked');
  });

  test('finalizeRound adds to history', () => {
    const room = makeRoom();
    startNewRound(room, 'p1');
    revealCategory(room);
    handleBuzz(room, 'p2');
    selectWinner(room, 'p2');

    const result = finalizeRound(room);
    expect(result).not.toBeNull();
    expect(result!.winnerId).toBe('p2');
    expect(room.roundHistory.length).toBe(1);
  });

  test('getNextReader returns winner as next reader', () => {
    const room = makeRoom();
    startNewRound(room, 'p1');
    revealCategory(room);
    handleBuzz(room, 'p3');
    selectWinner(room, 'p3');

    const next = getNextReader(room);
    expect(next).toBe('p3');
  });

  test('getNextReader returns next in order on skip', () => {
    const room = makeRoom();
    startNewRound(room, 'p1');
    // No winner set (skip)
    const next = getNextReader(room);
    const playerIds = Object.keys(room.players);
    const expectedIndex = (playerIds.indexOf('p1') + 1) % playerIds.length;
    expect(next).toBe(playerIds[expectedIndex]);
  });

  test('isLastRound detects end of game', () => {
    const room = makeRoom();
    room.maxRounds = 2;
    room.roundHistory = [
      {
        roundNumber: 1,
        category: { id: 1, name: 'A' },
        task: { id: 1, text: 'Starts with letter {letter}', requiresLetter: true },
        letter: 'A',
        readerId: 'p1',
        winnerId: 'p2',
      },
      {
        roundNumber: 2,
        category: { id: 2, name: 'B' },
        task: { id: 2, text: 'Starts with letter {letter}', requiresLetter: true },
        letter: 'B',
        readerId: 'p2',
        winnerId: 'p3',
      },
    ];
    expect(isLastRound(room)).toBe(true);
  });

  test('getRandomReader returns a valid player', () => {
    const room = makeRoom();
    const reader = getRandomReader(room);
    expect(Object.keys(room.players)).toContain(reader);
  });
});
