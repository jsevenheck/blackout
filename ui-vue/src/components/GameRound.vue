<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';

const store = useGameStore();

defineEmits<{
  reveal: [];
  buzz: [];
  selectWinner: [winnerId: string];
  skip: [];
}>();

const round = computed(() => store.currentRound);
const isReader = computed(() => store.isReader);
const timeLeft = ref(60);
let timerInterval: ReturnType<typeof setInterval> | null = null;

function updateTimer() {
  if (round.value?.timerEnd) {
    const remaining = Math.max(0, Math.ceil((round.value.timerEnd - Date.now()) / 1000));
    timeLeft.value = remaining;
    if (remaining <= 0 && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
}

onMounted(() => {
  timerInterval = setInterval(updateTimer, 200);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

const self = computed(() => store.self);
const hasBuzzed = computed(() => self.value?.hasBuzzed ?? false);

const buzzerPlayers = computed(() => {
  if (!round.value) return [];
  return round.value.buzzerOrder
    .map((id) => store.room?.players.find((p) => p.id === id))
    .filter(Boolean);
});

const taskText = computed(() => {
  if (!round.value?.task) return '';
  const letter = round.value.letter ?? '';
  return round.value.task.text.replace('{letter}', letter);
});
</script>

<template>
  <div class="game-round">
    <!-- Pre-reveal: Reader sees category, others wait -->
    <template v-if="!round?.revealed">
      <div
        v-if="isReader"
        class="reader-view"
      >
        <p class="label">
          You are the Reader!
        </p>
        <div class="category-card">
          <p class="task-text">
            {{ taskText }}
          </p>
          <p class="category-name">
            {{ round?.category?.name }}
          </p>
          <p
            v-if="round?.letter"
            class="letter"
          >
            {{ round?.letter }}
          </p>
        </div>
        <button
          class="btn btn-reveal"
          @click="$emit('reveal')"
        >
          Reveal!
        </button>
        <p class="hint">
          Click to reveal the category to all players
        </p>
      </div>
      <div
        v-else
        class="waiting-view"
      >
        <p class="label">
          Waiting for the reader to reveal...
        </p>
        <p class="reader-name">
          Reader: {{ store.room?.players.find((p) => p.id === round?.readerId)?.name }}
        </p>
      </div>
    </template>

    <!-- Post-reveal: Buzzer phase -->
    <template v-else>
      <div class="revealed-view">
        <div class="category-display">
          <p class="task-text">
            {{ taskText }}
          </p>
          <p class="category-name">
            {{ round?.category?.name }}
          </p>
          <p
            v-if="round?.letter"
            class="letter-big"
          >
            {{ round?.letter }}
          </p>
        </div>

        <div
          class="timer"
          :class="{ urgent: timeLeft <= 10 }"
        >
          {{ timeLeft }}s
        </div>

        <!-- Buzzer for non-readers -->
        <button
          v-if="!isReader && round?.buzzerState === 'open'"
          class="btn btn-buzzer"
          :class="{ buzzed: hasBuzzed }"
          :disabled="hasBuzzed"
          @click="$emit('buzz')"
        >
          {{ hasBuzzed ? 'BUZZED!' : 'BUZZ' }}
        </button>

        <!-- Buzzer order -->
        <div
          v-if="buzzerPlayers.length > 0"
          class="buzzer-order"
        >
          <h3>Buzzer Order</h3>
          <div
            v-for="(player, index) in buzzerPlayers"
            :key="player!.id"
            class="buzzer-entry"
          >
            <span class="buzzer-rank">#{{ index + 1 }}</span>
            <span class="buzzer-name">{{ player!.name }}</span>
            <button
              v-if="isReader && round?.buzzerState === 'open'"
              class="btn btn-correct"
              @click="$emit('selectWinner', player!.id)"
            >
              Correct!
            </button>
          </div>
        </div>

        <!-- Reader controls -->
        <div
          v-if="isReader"
          class="reader-controls"
        >
          <button
            class="btn btn-skip"
            @click="$emit('skip')"
          >
            Skip Round
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.game-round {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem 1rem;
}

.reader-view,
.waiting-view,
.revealed-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.label {
  color: #a1a1aa;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.category-card {
  background: #27272a;
  border: 2px solid #8b5cf6;
  border-radius: 12px;
  padding: 2rem 3rem;
  text-align: center;
}

.category-display {
  text-align: center;
}

.category-name {
  font-size: 1.5rem;
  color: #d4d4d8;
  margin-bottom: 0.5rem;
}

.task-text {
  color: #a78bfa;
  font-size: 1rem;
  margin-bottom: 0.35rem;
}

.letter,
.letter-big {
  font-size: 4rem;
  font-weight: 900;
  color: #8b5cf6;
}

.letter-big {
  font-size: 5rem;
  text-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
}

.timer {
  font-size: 2rem;
  font-weight: 700;
  color: #d4d4d8;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  background: #27272a;
}

.timer.urgent {
  color: #ef4444;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-reveal {
  background: #8b5cf6;
  color: #fff;
  font-size: 1.5rem;
  padding: 1rem 3rem;
}

.btn-reveal:hover {
  background: #7c3aed;
  transform: scale(1.05);
}

.btn-buzzer {
  background: #ef4444;
  color: #fff;
  font-size: 2rem;
  padding: 1.5rem 4rem;
  border-radius: 50%;
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
}

.btn-buzzer:hover:not(:disabled) {
  background: #dc2626;
  transform: scale(1.1);
}

.btn-buzzer.buzzed {
  background: #22c55e;
  box-shadow: 0 0 30px rgba(34, 197, 94, 0.4);
}

.btn-buzzer:disabled {
  cursor: default;
}

.buzzer-order {
  width: 100%;
  max-width: 320px;
}

.buzzer-order h3 {
  color: #a1a1aa;
  margin-bottom: 0.5rem;
  text-align: center;
}

.buzzer-entry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #27272a;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.buzzer-rank {
  color: #8b5cf6;
  font-weight: 700;
  min-width: 2rem;
}

.buzzer-name {
  flex: 1;
  color: #fff;
}

.btn-correct {
  background: #22c55e;
  color: #fff;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
}

.btn-correct:hover {
  background: #16a34a;
}

.btn-skip {
  background: #3f3f46;
  color: #a1a1aa;
  margin-top: 1rem;
}

.btn-skip:hover {
  background: #52525b;
  color: #fff;
}

.reader-controls {
  margin-top: 1rem;
}

.reader-name {
  color: #8b5cf6;
  font-size: 1.25rem;
  font-weight: 600;
}

.hint {
  color: #71717a;
  font-size: 0.875rem;
}
</style>
