<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWorkoutsStore } from '@/stores/workouts'
import AppButton from '@/components/AppButton.vue'

const auth = useAuthStore()
const workouts = useWorkoutsStore()
const router = useRouter()

const loading = ref(true)

onMounted(async () => {
  await workouts.fetchActiveMesocycle()

  if (workouts.activeMesocycle) {
    await workouts.fetchActiveMesocycleStructure()

    if (!workouts.currentWorkout.mesocycleComplete && workouts.currentWorkout.workoutId) {
      router.replace({
        name: '/workouts/[id]',
        params: { id: workouts.currentWorkout.workoutId },
      })
      return
    }
  }

  loading.value = false
})

function goToPlanMesocycle() {
  router.push({ name: '/mesocycles/plan' })
}

function restartMesocycle() {
  router.push({ name: '/mesocycles/build', query: { clone: workouts.activeMesocycle!.id } })
}

function goToWorkoutList() {
  router.push({ name: '/workouts/list' })
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <main
      v-if="loading"
      class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <p class="text-sm text-mist">Loading…</p>
    </main>

    <main
      v-else-if="!workouts.activeMesocycle"
      class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <p class="text-base font-medium text-chalk">No mesocycles yet</p>
      <p class="max-w-xs text-sm text-mist">
        Signed in as {{ auth.user?.email }}. Your training weeks will show up here once a mesocycle
        is set up.
      </p>
      <AppButton @click="goToPlanMesocycle">Plan mesocycle</AppButton>
    </main>

    <main v-else class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p class="text-base font-medium text-chalk">Mesocycle complete</p>
      <p class="max-w-xs text-sm text-mist">
        You've logged every workout in {{ workouts.activeMesocycle.name }}. Restart it to keep
        going, or review what you did.
      </p>
      <div class="flex items-center gap-2">
        <AppButton @click="restartMesocycle">Restart mesocycle</AppButton>
        <AppButton variant="secondary" @click="goToWorkoutList">View workouts</AppButton>
      </div>
    </main>
  </div>
</template>
