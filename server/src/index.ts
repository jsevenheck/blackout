import type { Server } from 'socket.io';
import { registerBlackout } from './socketHandlers';

export const definition = {
  id: 'blackout',
  name: 'Blackout',
  minPlayers: 3,
  maxPlayers: 20,
} as const;

/**
 * Game Hub plugin entry.
 * Registers the game Socket.IO handlers on `/g/<gameId>`.
 */
export function register(io: Server, namespace = '/g/blackout') {
  return registerBlackout(io, namespace);
}

export const handler = { definition, register };
