<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { useWorkoutsStore } from '@/stores/workouts'
import type { ExerciseDetail, WorkoutDetail } from '@/stores/workouts'
import AppButton from '@/components/AppButton.vue'
import WorkoutSwitcherSheet from '@/components/WorkoutSwitcherSheet.vue'
import MesocycleActionsSheet from '@/components/MesocycleActionsSheet.vue'
import { parseDecimalInput } from '@/utils/number'

const route = useRoute('/workouts/[id]')
const router = useRouter()
const workouts = useWorkoutsStore()

const detail = ref<WorkoutDetail | null>(null)
const loading = ref(true)
const switcherOpen = ref(false)
const actionsSheetOpen = ref(false)
const draft = reactive<Record<string, { weight: string; reps: string }>>({})

interface FirstSetWeightSnapshot {
  exerciseId: string
  weight: string
}

// Captures the first set's weight on every keystroke. refDebounced settles ~400ms
// after typing pauses so a multi-digit weight (e.g. "200") propagates to the other
// sets once, with its final value — not once per keystroke with each partial digit.
const firstSetWeightDraft = ref<FirstSetWeightSnapshot | null>(null)
const firstSetWeightDraftDebounced = refDebounced(firstSetWeightDraft, 400)

const nextWorkoutId = ref<string | null>(null)
const mesocycleComplete = ref(false)

function draftKey(exerciseId: string, setNumber: number) {
  return `${exerciseId}:${setNumber}`
}

function seedDraft(loadedDetail: WorkoutDetail) {
  for (const exercise of loadedDetail.exercises) {
    for (const set of exercise.sets) {
      draft[draftKey(exercise.id, set.setNumber)] = {
        weight: (set.weight ?? set.weightPrefill ?? '').toString(),
        reps: (set.reps ?? '').toString(),
      }
    }
  }
}

async function refreshCompletionState(workoutId: string) {
  if (!workouts.activeMesocycle) await workouts.fetchActiveMesocycle()
  if (workouts.activeMesocycle) await workouts.fetchActiveMesocycleStructure()

  const current = workouts.currentWorkout
  if (current.mesocycleComplete) {
    mesocycleComplete.value = true
  } else if (current.workoutId && current.workoutId !== workoutId) {
    nextWorkoutId.value = current.workoutId
  }
}

async function load() {
  loading.value = true
  nextWorkoutId.value = null
  mesocycleComplete.value = false
  firstSetWeightDraft.value = null // cancel any pending cross-fill from before this reload

  detail.value = await workouts.fetchWorkoutDetail(route.params.id as string)
  if (detail.value) seedDraft(detail.value)

  if (detail.value?.complete) {
    await refreshCompletionState(detail.value.id)
  }

  loading.value = false
}

onMounted(load)
watch(() => route.params.id, load)

watch(firstSetWeightDraftDebounced, (snapshot) => {
  if (!snapshot) return

  const exercise = detail.value?.exercises.find((e) => e.id === snapshot.exerciseId)
  const firstSet = exercise?.sets[0]
  if (!exercise || !firstSet) return

  // Staleness guard: bail if load() reseeded draft since this snapshot was
  // captured (route change, or a logSet()-triggered reload).
  const liveWeight = draft[draftKey(exercise.id, firstSet.setNumber)]?.weight
  if (liveWeight !== snapshot.weight) return

  for (const set of exercise.sets.slice(1)) {
    const entry = draft[draftKey(exercise.id, set.setNumber)]
    if (entry && !entry.weight) {
      entry.weight = snapshot.weight
    }
  }
})

function goToNextWorkout() {
  if (nextWorkoutId.value) {
    router.push({ name: '/workouts/[id]', params: { id: nextWorkoutId.value } })
  }
}

function onFirstSetWeightInput(exercise: ExerciseDetail) {
  const firstSet = exercise.sets[0]
  if (!firstSet) return

  const weight = draft[draftKey(exercise.id, firstSet.setNumber)]?.weight
  firstSetWeightDraft.value = weight ? { exerciseId: exercise.id, weight } : null
}

function canLog(exerciseId: string, setNumber: number) {
  const entry = draft[draftKey(exerciseId, setNumber)]
  if (!entry?.weight || !entry?.reps) return false
  return !Number.isNaN(parseDecimalInput(entry.weight))
}

function isExerciseFullyLogged(exercise: ExerciseDetail) {
  return exercise.sets.filter((set) => set.completedAt !== null).length >= exercise.targetSets
}

async function logSet(exerciseId: string, setNumber: number) {
  const entry = draft[draftKey(exerciseId, setNumber)]
  if (!entry?.weight || !entry.reps) return

  const weight = parseDecimalInput(entry.weight)
  const reps = Number(entry.reps)
  if (Number.isNaN(weight) || Number.isNaN(reps)) return

  const { error } = await workouts.logSet({
    mesocycleWorkoutExerciseId: exerciseId,
    setNumber,
    weight,
    reps,
  })
  if (error || !detail.value) return

  const exercise = detail.value.exercises.find((e) => e.id === exerciseId)
  const set = exercise?.sets.find((s) => s.setNumber === setNumber)
  if (!exercise || !set) return

  // Update just this set locally instead of a full load() — a full reload would
  // reseed every draft field from the server, wiping out typed-but-not-yet-logged
  // weights on other sets (they'd fall back to weightPrefill or clear entirely).
  set.weight = weight
  set.reps = reps
  set.completedAt = new Date().toISOString()

  detail.value.complete = detail.value.exercises.every(isExerciseFullyLogged)
  if (detail.value.complete) await refreshCompletionState(detail.value.id)
}

async function addSet(exercise: ExerciseDetail) {
  const { targetSets, error } = await workouts.addSet(exercise.id, exercise.targetSets)
  if (error || targetSets === null) return

  const newSetNumber = exercise.sets.reduce((max, set) => Math.max(max, set.setNumber), 0) + 1

  exercise.targetSets = targetSets
  exercise.sets.push({
    setNumber: newSetNumber,
    weight: null,
    reps: null,
    completedAt: null,
    weightPrefill: null,
    repsPlaceholder: null,
  })
  draft[draftKey(exercise.id, newSetNumber)] = { weight: '', reps: '' }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <header class="flex items-center gap-3 border-b border-line px-5 py-4">
      <div class="flex-1">
        <h1 class="font-sans font-bold text-lg tracking-tight text-chalk">{{ detail?.name }}</h1>
        <p v-if="detail" class="text-sm text-mist">
          Week {{ detail.weekNumber }}{{ detail.isDeload ? ' · Deload' : '' }}
        </p>
      </div>
      <AppButton variant="icon" aria-label="Jump to workout" @click="switcherOpen = true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </AppButton>
      <AppButton variant="icon" aria-label="Mesocycle options" @click="actionsSheetOpen = true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-5 w-5"
        >
          <circle cx="12" cy="5" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="12" cy="19" r="1.4" />
        </svg>
      </AppButton>
    </header>

    <WorkoutSwitcherSheet v-model:open="switcherOpen" :current-workout-id="detail?.id ?? null" />
    <MesocycleActionsSheet v-model:open="actionsSheetOpen" />

    <main class="flex flex-1 flex-col gap-6 px-5 py-6">
      <p v-if="loading" class="text-sm text-mist">Loading…</p>

      <template v-else-if="detail">
        <p v-if="detail.complete" class="text-sm font-medium text-brass">Workout complete</p>

        <div
          v-for="exercise in detail.exercises"
          :key="exercise.id"
          class="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3"
        >
          <p class="text-base font-medium text-chalk">{{ exercise.name }}</p>

          <div
            v-for="(set, setIndex) in exercise.sets"
            :key="set.setNumber"
            class="flex items-center gap-2"
          >
            <span class="w-14 text-sm text-mist">Set {{ set.setNumber }}</span>

            <span v-if="detail.complete" class="text-sm text-chalk">
              {{ set.weight }} × {{ set.reps }}
            </span>

            <template v-else>
              <input
                v-model="draft[draftKey(exercise.id, set.setNumber)]!.weight"
                type="text"
                inputmode="decimal"
                placeholder="Weight"
                class="w-20 rounded-lg border border-line bg-surface-raised px-3 py-2 text-base text-chalk placeholder:text-mist/60 outline-none focus-visible:border-brass"
                @input="setIndex === 0 && onFirstSetWeightInput(exercise)"
              />
              <input
                v-model="draft[draftKey(exercise.id, set.setNumber)]!.reps"
                type="number"
                inputmode="numeric"
                :placeholder="set.repsPlaceholder !== null ? `${set.repsPlaceholder} reps` : 'Reps'"
                class="w-20 rounded-lg border border-line bg-surface-raised px-3 py-2 text-base text-chalk placeholder:text-mist/60 outline-none focus-visible:border-brass [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <AppButton
                variant="secondary"
                :disabled="!canLog(exercise.id, set.setNumber)"
                @click="logSet(exercise.id, set.setNumber)"
              >
                {{ set.completedAt ? 'Update' : 'Log' }}
              </AppButton>
            </template>
          </div>

          <AppButton
            v-if="!detail.complete"
            variant="ghost"
            class="self-start"
            @click="addSet(exercise)"
          >
            + Add set
          </AppButton>
        </div>

        <AppButton v-if="nextWorkoutId" class="w-full" @click="goToNextWorkout">
          Next workout
        </AppButton>
        <AppButton v-else-if="mesocycleComplete" class="w-full" @click="router.push({ name: '/' })">
          Finish mesocycle
        </AppButton>
      </template>
    </main>
  </div>
</template>
