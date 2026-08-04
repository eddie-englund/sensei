<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { ref, watch } from 'vue'
import { useWorkoutsStore } from '@/stores/workouts'
import type { ExerciseHistoryEntry } from '@/stores/workouts'
import AppButton from '@/components/AppButton.vue'

const props = defineProps<{
  exerciseId: string
  exerciseName: string
}>()

const open = defineModel<boolean>('open', { default: false })

const workouts = useWorkoutsStore()
const loading = ref(false)
const entries = ref<ExerciseHistoryEntry[]>([])

function close() {
  open.value = false
}

watch(
  open,
  async (isOpen) => {
    if (!isOpen) return
    loading.value = true
    entries.value = await workouts.fetchExerciseHistory(props.exerciseId)
    loading.value = false
  },
  { immediate: true },
)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

onKeyStroke('Escape', close)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40 bg-ink/70" @click="close" />
    <section
      v-if="open"
      class="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-5 rounded-t-2xl border-t border-line bg-surface px-5 py-5"
    >
      <div class="flex items-center justify-between">
        <span class="font-sans font-bold text-base tracking-tight text-chalk">
          {{ exerciseName }}
        </span>
        <AppButton variant="icon" aria-label="Close" @click="close">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </AppButton>
      </div>

      <p v-if="loading" class="text-sm text-mist">Loading…</p>

      <p v-else-if="entries.length === 0" class="text-sm text-mist">
        No sets logged yet for this exercise.
      </p>

      <div v-else class="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
        <div
          v-for="entry in entries"
          :key="entry.mesocycleWorkoutExerciseId"
          class="flex flex-col gap-1 rounded-lg border border-line bg-surface-raised p-3"
        >
          <p class="text-sm font-medium text-chalk">
            {{ entry.mesocycleName }} · Week {{ entry.weekNumber
            }}{{ entry.isDeload ? ' · Deload' : '' }}
          </p>
          <p class="text-xs text-mist">{{ formatDate(entry.loggedAt) }}</p>
          <p v-for="set in entry.sets" :key="set.setNumber" class="text-sm text-chalk">
            {{ set.weight }} × {{ set.reps }}
          </p>
        </div>
      </div>
    </section>
  </Teleport>
</template>
