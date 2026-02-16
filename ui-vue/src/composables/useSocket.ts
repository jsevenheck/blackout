import { ref, onUnmounted } from 'vue';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/events';

export type BlackoutSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(opts?: {
  apiBaseUrl?: string;
  sessionId?: string;
  joinToken?: string;
  playerId?: string;
}): { socket: BlackoutSocket; connected: ReturnType<typeof ref<boolean>> } {
  const connected = ref(false);

  const url = opts?.apiBaseUrl || window.location.origin;

  const socket: BlackoutSocket = io(`${url}/g/blackout`, {
    auth: {
      sessionId: opts?.sessionId,
      joinToken: opts?.joinToken,
      playerId: opts?.playerId,
    },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    connected.value = true;
  });

  socket.on('disconnect', () => {
    connected.value = false;
  });

  onUnmounted(() => {
    socket.disconnect();
  });

  return { socket, connected };
}
