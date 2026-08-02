<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkoutsStore } from '@/stores/workouts'
import AppButton from '@/components/AppButton.vue'

const router = useRouter()
const workouts = useWorkoutsStore()
const loading = ref(true)

const statusLabel: Record<string, string> = {
  complete: 'Done',
  current: 'Current',
  upcoming: 'Upcoming',
}

const statusClass: Record<string, string> = {
  complete: 'text-mist',
  current: 'text-brass',
  upcoming: 'text-mist/60',
}

onMounted(async () => {
  if (!workouts.activeMesocycle) {
    await workouts.fetchActiveMesocycle()
  }
  if (workouts.activeMesocycle && workouts.structure.length === 0) {
    await workouts.fetchActiveMesocycleStructure()
  }
  loading.value = false
})

function goToWorkout(id: string) {
  router.push({ name: '/workouts/[id]', params: { id } })
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <header class="flex items-center gap-3 border-b border-line px-5 py-4">
      <AppButton variant="ghost" @click="router.back()">Back</AppButton>
      <h1 class="font-sans font-bold text-lg tracking-tight text-chalk">Workouts</h1>
    </header>

    <main class="flex flex-1 flex-col gap-6 px-5 py-6">
      <p v-if="loading" class="text-sm text-mist">Loading…</p>

      <template v-else>
        <section
          v-for="week in workouts.weekSummaries"
          :key="week.weekNumber"
          class="flex flex-col gap-2"
        >
          <h2 class="text-sm font-semibold tracking-wide text-mist uppercase">
            Week {{ week.weekNumber }}{{ week.isDeload ? ' · Deload' : '' }}
          </h2>
          <div class="flex flex-col gap-2">
            <button
              v-for="workout in week.workouts"
              :key="workout.id"
              type="button"
              class="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-brass/60"
              @click="goToWorkout(workout.id)"
            >
              <span class="font-medium text-chalk">{{ workout.name }}</span>
              <span class="text-sm font-medium" :class="statusClass[workout.status]">
                {{ statusLabel[workout.status] }}
              </span>
            </button>
          </div>
        </section>

        <p v-if="workouts.weekSummaries.length === 0" class="text-sm text-mist">
          No workouts yet.
        </p>
      </template>
    </main>
  </div>
</template>
