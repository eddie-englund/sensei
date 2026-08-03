<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkoutsStore } from '@/stores/workouts'
import AppButton from '@/components/AppButton.vue'

const props = defineProps<{
  currentWorkoutId: string | null
}>()

const open = defineModel<boolean>('open', { default: false })

const router = useRouter()
const workouts = useWorkoutsStore()

function close() {
  open.value = false
}

async function ensureStructureLoaded() {
  if (!workouts.activeMesocycle) await workouts.fetchActiveMesocycle()
  if (workouts.activeMesocycle && workouts.structure.length === 0) {
    await workouts.fetchActiveMesocycleStructure()
  }
}

watch(open, (isOpen) => {
  if (isOpen) ensureStructureLoaded()
})

function goToWorkout(id: string) {
  if (id !== props.currentWorkoutId) {
    router.push({ name: '/workouts/[id]', params: { id } })
  }
  close()
}

const statusPillClass: Record<string, string> = {
  complete: 'border border-line bg-surface-raised text-mist',
  current: 'bg-brass text-ink font-semibold',
  upcoming: 'border border-line text-mist/60',
}

onKeyStroke('Escape', close)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40 bg-ink/70" @click="close" />
    <section
      v-if="open"
      class="fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col gap-4 rounded-t-2xl border-t border-line bg-surface px-5 py-5"
    >
      <div class="flex items-center justify-between">
        <span class="font-sans font-bold text-base tracking-tight text-chalk">Jump to workout</span>
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

      <div class="flex flex-1 flex-col gap-4 overflow-y-auto">
        <div v-for="week in workouts.weekSummaries" :key="week.weekNumber" class="flex flex-col gap-2">
          <h2 class="text-sm font-semibold tracking-wide text-mist uppercase">
            Week {{ week.weekNumber }}{{ week.isDeload ? ' · Deload' : '' }}
          </h2>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="workout in week.workouts"
              :key="workout.id"
              type="button"
              :aria-label="`Week ${week.weekNumber} Day ${workout.dayNumber} — ${workout.status}`"
              class="min-w-12 rounded-lg px-3 py-2 text-sm transition-colors"
              :class="[
                statusPillClass[workout.status],
                workout.id === currentWorkoutId ? 'ring-2 ring-brass ring-offset-2 ring-offset-surface' : '',
              ]"
              @click="goToWorkout(workout.id)"
            >
              D{{ workout.dayNumber }}
            </button>
          </div>
        </div>

        <p v-if="workouts.weekSummaries.length === 0" class="text-sm text-mist">No workouts yet.</p>
      </div>
    </section>
  </Teleport>
</template>
