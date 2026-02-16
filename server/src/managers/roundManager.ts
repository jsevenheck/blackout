import type { Room, RoundResult } from '../../../core/src/types';
import { ROUND_TIMER_MS } from '../../../core/src/constants';
import { getUnusedPrompt } from './categoryManager';

export function startNewRound(room: Room, readerId: string): void {
  const roundNumber = room.roundHistory.length + 1;
  const { category, task, letter } = getUnusedPrompt(
    room.usedCategoryLetterPairs,
    room.language,
    room.excludedLetters
  );
  room.usedCategoryLetterPairs.add(`${category.id}:${task.id}:${letter ?? '-'}`);

  // Reset buzzer state for all players
  for (const player of Object.values(room.players)) {
    player.hasBuzzed = false;
  }

  room.currentRound = {
    roundNumber,
    category,
    task,
    letter,
    readerId,
    buzzerState: 'waiting',
    buzzerOrder: [],
    winnerId: null,
    revealed: false,
    timerEnd: null,
  };
}

export function revealCategory(room: Room): void {
  if (!room.currentRound) return;
  room.currentRound.revealed = true;
  room.currentRound.buzzerState = 'open';
  room.currentRound.timerEnd = Date.now() + ROUND_TIMER_MS;
}

export function handleBuzz(room: Room, playerId: string): boolean {
  const round = room.currentRound;
  if (!round) return false;
  if (round.buzzerState !== 'open') return false;
  if (round.readerId === playerId) return false;

  const player = room.players[playerId];
  if (!player || player.hasBuzzed) return false;

  player.hasBuzzed = true;
  round.buzzerOrder.push(playerId);
  return true;
}

export function selectWinner(room: Room, winnerId: string): void {
  if (!room.currentRound) return;
  room.currentRound.winnerId = winnerId;
  room.currentRound.buzzerState = 'locked';
}

export function finalizeRound(room: Room): RoundResult | null {
  const round = room.currentRound;
  if (!round) return null;

  const result: RoundResult = {
    roundNumber: round.roundNumber,
    category: round.category,
    task: round.task,
    letter: round.letter,
    readerId: round.readerId,
    winnerId: round.winnerId,
  };

  room.roundHistory.push(result);
  return result;
}

export function getNextReader(room: Room): string | null {
  const round = room.currentRound;
  if (!round) return null;

  // Winner becomes next reader
  if (round.winnerId) return round.winnerId;

  // Skip: next player in order after current reader
  const playerIds = Object.keys(room.players);
  const currentIndex = playerIds.indexOf(round.readerId);
  const nextIndex = (currentIndex + 1) % playerIds.length;
  return playerIds[nextIndex];
}

export function getRandomReader(room: Room): string {
  const playerIds = Object.keys(room.players);
  return playerIds[Math.floor(Math.random() * playerIds.length)];
}

export function isLastRound(room: Room): boolean {
  return room.roundHistory.length >= room.maxRounds;
}

export function isTimerExpired(room: Room): boolean {
  const round = room.currentRound;
  if (!round || !round.timerEnd) return false;
  return Date.now() >= round.timerEnd;
}
