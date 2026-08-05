<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { useWorkoutsStore } from '@/stores/workouts'
import type { ExerciseDetail, SetMarker, SetViewModel, WorkoutDetail } from '@/stores/workouts'
import AppButton from '@/components/AppButton.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import WorkoutSwitcherSheet from '@/components/WorkoutSwitcherSheet.vue'
import MesocycleActionsSheet from '@/components/MesocycleActionsSheet.vue'
import ExerciseNoteSheet from '@/components/ExerciseNoteSheet.vue'
import ExerciseHistorySheet from '@/components/ExerciseHistorySheet.vue'
import ExerciseActionsSheet from '@/components/ExerciseActionsSheet.vue'
import ExerciseSwapSheet from '@/components/ExerciseSwapSheet.vue'
import SetActionsSheet from '@/components/SetActionsSheet.vue'
import { parseDecimalInput } from '@/utils/number'

const route = useRoute('/workouts/[id]')
const router = useRouter()
const workouts = useWorkoutsStore()

const detail = ref<WorkoutDetail | null>(null)
const loading = ref(true)
const switcherOpen = ref(false)
const actionsSheetOpen = ref(false)
const noteSheetOpen = ref(false)
const activeNoteExercise = ref<ExerciseDetail | null>(null)
const historySheetOpen = ref(false)
const activeHistoryExercise = ref<ExerciseDetail | null>(null)
const exerciseActionsOpen = ref(false)
const swapSheetOpen = ref(false)
const actionsSheetExercise = ref<ExerciseDetail | null>(null)
const draft = reactive<Record<string, { weight: string; reps: string }>>({})

const setActionsOpen = ref(false)
const setActionsTarget = ref<{ exercise: ExerciseDetail; setNumber: number } | null>(null)
const setActionsCurrentSet = computed(
  () =>
    setActionsTarget.value?.exercise.sets.find(
      (s) => s.setNumber === setActionsTarget.value!.setNumber,
    ) ?? null,
)

const editConfirmOpen = ref(false)
const editConfirmTarget = ref<{
  exercise: ExerciseDetail
  set: SetViewModel
  field: HTMLInputElement
} | null>(null)

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
        reps: (set.reps ?? set.repsPrefill ?? '').toString(),
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
  return (
    exercise.sets.filter((set) => set.completedAt !== null || set.skippedAt !== null).length >=
    exercise.targetSets
  )
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
    skippedAt: null,
    weightPrefill: null,
    repsPlaceholder: null,
    repsPrefill: null,
    marker: null,
  })
  draft[draftKey(exercise.id, newSetNumber)] = { weight: '', reps: '' }
}

async function onUnlog(exercise: ExerciseDetail, set: SetViewModel) {
  const { error } = await workouts.unlogSet(exercise.id, set.setNumber)
  if (error || !detail.value) return

  set.completedAt = null
  detail.value.complete = detail.value.exercises.every(isExerciseFullyLogged)
}

function onLockedFocus(event: FocusEvent, exercise: ExerciseDetail, set: SetViewModel) {
  if (set.completedAt === null) return

  const field = event.target as HTMLInputElement
  field.blur()
  editConfirmTarget.value = { exercise, set, field }
  editConfirmOpen.value = true
}

async function confirmEditLoggedSet() {
  const target = editConfirmTarget.value
  editConfirmOpen.value = false
  if (!target) return

  await onUnlog(target.exercise, target.set)
  await nextTick()
  target.field.focus()
}

function openSetActions(exercise: ExerciseDetail, setNumber: number) {
  setActionsTarget.value = { exercise, setNumber }
  setActionsOpen.value = true
}

async function onSkipSet() {
  const target = setActionsTarget.value
  const set = setActionsCurrentSet.value
  if (!target || !set || !detail.value) return

  const { error } = await workouts.skipSet(target.exercise.id, set.setNumber)
  if (error) return

  set.skippedAt = new Date().toISOString()
  set.weight = null
  set.reps = null
  detail.value.complete = detail.value.exercises.every(isExerciseFullyLogged)
  if (detail.value.complete) await refreshCompletionState(detail.value.id)
}

async function onUnskipSet() {
  const target = setActionsTarget.value
  const set = setActionsCurrentSet.value
  if (!target || !set || !detail.value) return

  const { error } = await workouts.unskipSet(target.exercise.id, set.setNumber)
  if (error) return

  set.skippedAt = null
  detail.value.complete = detail.value.exercises.every(isExerciseFullyLogged)
}

async function onRemoveSet() {
  const target = setActionsTarget.value
  if (!target || !detail.value) return

  const { exercise, setNumber } = target
  const { targetSets, error } = await workouts.removeSet(exercise.id, exercise.targetSets)
  if (error || targetSets === null) return

  exercise.targetSets = targetSets
  exercise.sets = exercise.sets.filter((s) => s.setNumber !== setNumber)
  delete draft[draftKey(exercise.id, setNumber)]
  detail.value.complete = detail.value.exercises.every(isExerciseFullyLogged)
}

async function onSetMarker(marker: SetMarker | null) {
  const target = setActionsTarget.value
  const set = setActionsCurrentSet.value
  if (!target || !set || !detail.value) return

  const nextMarker = set.marker === marker ? null : marker
  const { error } = await workouts.setSetMarker({
    mesocycleId: detail.value.mesocycleId,
    exerciseId: target.exercise.exerciseId,
    setNumber: set.setNumber,
    marker: nextMarker,
  })
  if (error) return

  set.marker = nextMarker
}

function openNoteSheet(exercise: ExerciseDetail) {
  activeNoteExercise.value = exercise
  noteSheetOpen.value = true
}

function openExerciseActions(exercise: ExerciseDetail) {
  actionsSheetExercise.value = exercise
  exerciseActionsOpen.value = true
}

function onViewHistory() {
  if (!actionsSheetExercise.value) return
  activeHistoryExercise.value = actionsSheetExercise.value
  historySheetOpen.value = true
}

function onChooseSwap() {
  swapSheetOpen.value = true
}

async function onSwap({
  newExerciseId,
  scope,
}: {
  newExerciseId: string
  scope: 'week' | 'mesocycle'
}) {
  const exercise = actionsSheetExercise.value
  if (!exercise) return

  const { error } = await workouts.swapExercise({
    mesocycleWorkoutExerciseId: exercise.id,
    newExerciseId,
    scope,
  })
  if (error) return

  await load()
}

async function onSaveNote({ content, pinned }: { content: string; pinned: boolean }) {
  const exercise = activeNoteExercise.value
  if (!exercise || !detail.value) return

  const { error } = await workouts.saveExerciseNote({
    mesocycleWorkoutExerciseId: exercise.id,
    mesocycleId: detail.value.mesocycleId,
    exerciseId: exercise.exerciseId,
    content,
    pinned,
  })
  if (error) return

  const note = content.trim() ? { content: content.trim(), pinned } : null

  // A pinned note applies to every occurrence of this exercise in the workout;
  // un-pinning clears it everywhere except the row that was actually edited.
  for (const candidate of detail.value.exercises) {
    if (candidate.exerciseId !== exercise.exerciseId) continue
    if (candidate.id === exercise.id) {
      candidate.note = note
    } else if (pinned) {
      candidate.note = note
    } else if (candidate.note?.pinned) {
      candidate.note = null
    }
  }
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
    <ExerciseNoteSheet
      v-if="activeNoteExercise"
      v-model:open="noteSheetOpen"
      :exercise-name="activeNoteExercise.name"
      :initial-content="activeNoteExercise.note?.content ?? ''"
      :initial-pinned="activeNoteExercise.note?.pinned ?? false"
      @save="onSaveNote"
    />
    <ExerciseHistorySheet
      v-if="activeHistoryExercise"
      v-model:open="historySheetOpen"
      :exercise-id="activeHistoryExercise.exerciseId"
      :exercise-name="activeHistoryExercise.name"
    />
    <ExerciseActionsSheet
      v-if="actionsSheetExercise"
      v-model:open="exerciseActionsOpen"
      :exercise-name="actionsSheetExercise.name"
      @view-history="onViewHistory"
      @swap="onChooseSwap"
    />
    <ExerciseSwapSheet
      v-if="actionsSheetExercise"
      v-model:open="swapSheetOpen"
      :exercise-name="actionsSheetExercise.name"
      :current-exercise-id="actionsSheetExercise.exerciseId"
      :has-logged-sets="actionsSheetExercise.sets.some((set) => set.completedAt !== null)"
      @swap="onSwap"
    />
    <SetActionsSheet
      v-if="setActionsTarget && setActionsCurrentSet"
      v-model:open="setActionsOpen"
      :set-number="setActionsTarget.setNumber"
      :is-skipped="setActionsCurrentSet.skippedAt !== null"
      :is-logged="setActionsCurrentSet.completedAt !== null"
      :is-trailing-set="
        setActionsTarget.setNumber ===
        Math.max(...setActionsTarget.exercise.sets.map((s) => s.setNumber))
      "
      :marker="setActionsCurrentSet.marker"
      @skip="onSkipSet"
      @unskip="onUnskipSet"
      @remove="onRemoveSet"
      @set-marker="onSetMarker"
    />
    <AppConfirmDialog
      :open="editConfirmOpen"
      title="Edit logged set?"
      :message="`Set ${editConfirmTarget?.set.setNumber ?? ''} is already logged. Uncheck it to edit, or continue now.`"
      confirm-label="Edit anyway"
      @confirm="confirmEditLoggedSet"
      @cancel="editConfirmOpen = false"
    />

    <main class="flex flex-1 flex-col gap-6 px-5 py-6">
      <p v-if="loading" class="text-sm text-mist">Loading…</p>

      <template v-else-if="detail">
        <p v-if="detail.complete" class="text-sm font-medium text-brass">Workout complete</p>

        <div
          v-for="exercise in detail.exercises"
          :key="exercise.id"
          class="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-base font-medium text-chalk">{{ exercise.name }}</p>
            <AppButton
              variant="icon"
              aria-label="Exercise options"
              @click="openExerciseActions(exercise)"
            >
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
          </div>

          <button
            type="button"
            class="w-full truncate text-left text-sm text-mist hover:text-chalk"
            @click="openNoteSheet(exercise)"
          >
            {{ exercise.note?.pinned ? '📌 ' : '' }}{{ exercise.note?.content || 'Add note' }}
          </button>

          <div
            v-for="(set, setIndex) in exercise.sets"
            :key="set.setNumber"
            class="flex items-center gap-2"
          >
            <button
              type="button"
              class="w-14 text-left text-sm text-mist hover:text-chalk"
              @click="openSetActions(exercise, set.setNumber)"
            >
              Set {{ set.setNumber }}
            </button>

            <span v-if="set.skippedAt" class="text-sm text-mist">Skipped</span>
            <span v-else-if="detail.complete" class="text-sm text-chalk">
              {{ set.weight }} × {{ set.reps }}
            </span>

            <template v-else>
              <input
                v-model="draft[draftKey(exercise.id, set.setNumber)]!.weight"
                type="text"
                inputmode="decimal"
                placeholder="Weight"
                :readonly="set.completedAt !== null"
                class="w-20 rounded-lg border px-3 py-2 text-base outline-none focus-visible:border-brass"
                :class="
                  set.completedAt !== null
                    ? 'border-line bg-surface text-mist'
                    : 'border-line bg-surface-raised text-chalk placeholder:text-mist/60'
                "
                @focus="onLockedFocus($event, exercise, set)"
                @input="setIndex === 0 && onFirstSetWeightInput(exercise)"
              />
              <div class="relative">
                <input
                  v-model="draft[draftKey(exercise.id, set.setNumber)]!.reps"
                  type="number"
                  inputmode="numeric"
                  :placeholder="
                    set.repsPlaceholder !== null ? `${set.repsPlaceholder} reps` : 'Reps'
                  "
                  :readonly="set.completedAt !== null"
                  class="w-20 rounded-lg border px-3 py-2 text-base outline-none focus-visible:border-brass [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  :class="
                    set.completedAt !== null
                      ? 'border-line bg-surface text-mist'
                      : 'border-line bg-surface-raised text-chalk placeholder:text-mist/60'
                  "
                  @focus="onLockedFocus($event, exercise, set)"
                />
                <span
                  v-if="set.marker !== null"
                  class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-mist/70 text-[10px] font-bold text-ink"
                >
                  M
                </span>
              </div>
              <button
                type="button"
                :disabled="set.completedAt === null && !canLog(exercise.id, set.setNumber)"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                :class="
                  set.completedAt !== null
                    ? 'bg-brass text-ink'
                    : 'border border-line text-mist hover:border-brass/60 hover:text-brass'
                "
                :aria-label="set.completedAt !== null ? 'Unlog set' : 'Log set'"
                @click="
                  set.completedAt !== null
                    ? onUnlog(exercise, set)
                    : logSet(exercise.id, set.setNumber)
                "
              >
                <svg
                  v-if="set.completedAt !== null"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-4 w-4"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </button>
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
