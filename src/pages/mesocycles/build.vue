<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'
import { useWorkoutsStore } from '@/stores/workouts'
import AppButton from '@/components/AppButton.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import ExercisePicker from '@/components/ExercisePicker.vue'

interface BuilderExercise {
  key: string
  exerciseId: string | null
}

interface BuilderWorkout {
  key: string
  name: string
  exercises: BuilderExercise[]
}

type SourceRow = Record<string, unknown>

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const workoutsStore = useWorkoutsStore()

const name = ref('')
const weekCount = ref(4)
const workouts = ref<BuilderWorkout[]>([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const showReplaceConfirm = ref(false)

const hasIncompleteActiveMesocycle = computed(
  () => workoutsStore.activeMesocycle !== null && !workoutsStore.currentWorkout.mesocycleComplete,
)

function newExercise(): BuilderExercise {
  return { key: crypto.randomUUID(), exerciseId: null }
}

function newWorkout(): BuilderWorkout {
  return { key: crypto.randomUUID(), name: '', exercises: [newExercise()] }
}

function addWorkout() {
  workouts.value.push(newWorkout())
}

function removeWorkout(workoutKey: string) {
  workouts.value = workouts.value.filter((workout) => workout.key !== workoutKey)
}

function addExercise(workout: BuilderWorkout) {
  workout.exercises.push(newExercise())
}

function removeExercise(workout: BuilderWorkout, exerciseKey: string) {
  workout.exercises = workout.exercises.filter((exercise) => exercise.key !== exerciseKey)
}

async function loadStructure(options: {
  weeksTable: string
  weeksParentColumn: string
  parentId: string
  workoutsTable: string
  workoutsParentColumn: string
  exercisesTable: string
  exercisesParentColumn: string
}): Promise<{ weekCount: number; workouts: BuilderWorkout[] }> {
  const { data: sourceWeeks } = await supabase
    .from(options.weeksTable)
    .select('id,week_number')
    .eq(options.weeksParentColumn, options.parentId)
    .order('week_number')

  const firstWeekId = (sourceWeeks ?? [])[0]?.id as string | undefined

  if (!firstWeekId) {
    return { weekCount: (sourceWeeks ?? []).length, workouts: [] }
  }

  const { data: sourceWorkouts } = await supabase
    .from(options.workoutsTable)
    .select('*')
    .eq(options.workoutsParentColumn, firstWeekId)
    .order('day_number')

  const workoutIds = (sourceWorkouts ?? []).map((workout: SourceRow) => workout.id as string)

  const { data: sourceExercises } = await supabase
    .from(options.exercisesTable)
    .select('*')
    .in(options.exercisesParentColumn, workoutIds)
    .order('order_index')

  const loadedWorkouts = (sourceWorkouts ?? []).map((workout: SourceRow) => ({
    key: crypto.randomUUID(),
    name: workout.name as string,
    exercises: (sourceExercises ?? [])
      .filter((exercise: SourceRow) => exercise[options.exercisesParentColumn] === workout.id)
      .map((exercise: SourceRow) => ({
        key: crypto.randomUUID(),
        exerciseId: exercise.exercise_id as string,
      })),
  }))

  return { weekCount: (sourceWeeks ?? []).length, workouts: loadedWorkouts }
}

async function loadFromTemplate(templateId: string) {
  const { data: template } = await supabase
    .from('mesocycle_templates')
    .select('name')
    .eq('id', templateId)
    .single()

  name.value = template?.name ?? ''

  const result = await loadStructure({
    weeksTable: 'mesocycle_template_weeks',
    weeksParentColumn: 'mesocycle_template_id',
    parentId: templateId,
    workoutsTable: 'mesocycle_template_workouts',
    workoutsParentColumn: 'mesocycle_template_week_id',
    exercisesTable: 'mesocycle_template_workout_exercises',
    exercisesParentColumn: 'mesocycle_template_workout_id',
  })

  weekCount.value = result.weekCount
  workouts.value = result.workouts
}

async function loadFromClone(mesocycleId: string) {
  const { data: source } = await supabase
    .from('mesocycles')
    .select('name')
    .eq('id', mesocycleId)
    .single()

  name.value = source?.name ? `${source.name} copy` : ''

  const result = await loadStructure({
    weeksTable: 'mesocycle_weeks',
    weeksParentColumn: 'mesocycle_id',
    parentId: mesocycleId,
    workoutsTable: 'mesocycle_workouts',
    workoutsParentColumn: 'mesocycle_week_id',
    exercisesTable: 'mesocycle_workout_exercises',
    exercisesParentColumn: 'mesocycle_workout_id',
  })

  weekCount.value = result.weekCount
  workouts.value = result.workouts
}

onMounted(async () => {
  const templateId = route.query.template as string | undefined
  const cloneId = route.query.clone as string | undefined

  loading.value = true

  await workoutsStore.fetchActiveMesocycle()
  if (workoutsStore.activeMesocycle) {
    await workoutsStore.fetchActiveMesocycleStructure()
  }

  if (templateId) {
    await loadFromTemplate(templateId)
  } else if (cloneId) {
    await loadFromClone(cloneId)
  }

  if (workouts.value.length === 0) {
    workouts.value = [newWorkout()]
  }

  loading.value = false
})

async function save() {
  errorMessage.value = ''

  if (!name.value.trim()) {
    errorMessage.value = 'Name your mesocycle before saving.'
    return
  }
  if (weekCount.value < 1) {
    errorMessage.value = 'A mesocycle needs at least one week.'
    return
  }
  if (workouts.value.length === 0) {
    errorMessage.value = 'Add at least one workout.'
    return
  }
  const hasEmptyExercise = workouts.value.some((workout) =>
    workout.exercises.some((exercise) => !exercise.exerciseId),
  )
  if (hasEmptyExercise) {
    errorMessage.value = 'Pick an exercise for every exercise row before saving.'
    return
  }

  if (hasIncompleteActiveMesocycle.value) {
    showReplaceConfirm.value = true
    return
  }

  await persistMesocycle()
}

async function confirmReplace() {
  showReplaceConfirm.value = false
  await persistMesocycle()
}

async function persistMesocycle() {
  saving.value = true
  let mesocycleId: string | null = null

  try {
    await supabase.from('mesocycles').update({ is_active: false }).eq('created_by', auth.user!.id)

    const { data: mesocycle, error: mesocycleError } = await supabase
      .from('mesocycles')
      .insert({
        name: name.value.trim(),
        created_by: auth.user!.id,
        is_active: true,
        cloned_from_id: (route.query.clone as string | undefined) ?? null,
      })
      .select('id')
      .single()

    if (mesocycleError || !mesocycle)
      throw mesocycleError ?? new Error('Could not create mesocycle.')
    mesocycleId = mesocycle.id

    const weekRows = Array.from({ length: weekCount.value }, (_, weekIndex) => ({
      mesocycle_id: mesocycleId,
      week_number: weekIndex + 1,
      is_deload: weekIndex === weekCount.value - 1,
    }))

    const { data: insertedWeeks, error: weeksError } = await supabase
      .from('mesocycle_weeks')
      .insert(weekRows)
      .select('id,week_number')

    if (weeksError || !insertedWeeks) throw weeksError ?? new Error('Could not create weeks.')

    const weekIdByNumber = new Map<number, string>(
      insertedWeeks.map((week) => [week.week_number, week.id]),
    )

    const workoutRows = Array.from({ length: weekCount.value }, (_, weekIndex) =>
      workouts.value.map((workout, workoutIndex) => ({
        mesocycle_week_id: weekIdByNumber.get(weekIndex + 1),
        day_number: workoutIndex + 1,
        name: workout.name.trim() || `Day ${workoutIndex + 1}`,
      })),
    ).flat()

    const { data: insertedWorkouts, error: workoutsError } = await supabase
      .from('mesocycle_workouts')
      .insert(workoutRows)
      .select('id,mesocycle_week_id,day_number')

    if (workoutsError || !insertedWorkouts)
      throw workoutsError ?? new Error('Could not create workouts.')

    const workoutIdByKey = new Map<string, string>(
      insertedWorkouts.map((workout) => [
        `${workout.mesocycle_week_id}:${workout.day_number}`,
        workout.id,
      ]),
    )

    const exerciseRows = Array.from({ length: weekCount.value }, (_, weekIndex) => {
      const weekId = weekIdByNumber.get(weekIndex + 1)
      return workouts.value.flatMap((workout, workoutIndex) => {
        const workoutId = workoutIdByKey.get(`${weekId}:${workoutIndex + 1}`)
        return workout.exercises.map((exercise, exerciseIndex) => ({
          mesocycle_workout_id: workoutId,
          exercise_id: exercise.exerciseId,
          order_index: exerciseIndex,
        }))
      })
    }).flat()

    if (exerciseRows.length > 0) {
      const { error: exercisesError } = await supabase
        .from('mesocycle_workout_exercises')
        .insert(exerciseRows)

      if (exercisesError) throw exercisesError
    }

    router.push({ name: '/' })
  } catch (error) {
    if (mesocycleId) {
      await supabase.from('mesocycles').delete().eq('id', mesocycleId)
    }
    errorMessage.value =
      error instanceof Error ? error.message : 'Could not save mesocycle. Try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <header class="flex items-center gap-3 border-b border-line px-5 py-4">
      <h1 class="font-sans font-bold text-lg tracking-tight text-chalk">Build mesocycle</h1>
    </header>

    <main class="flex flex-1 flex-col gap-6 px-5 py-6">
      <p v-if="loading" class="text-sm text-mist">Loading…</p>

      <template v-else>
        <div class="flex flex-col gap-2">
          <label for="mesocycle-name" class="text-sm font-medium text-mist">Mesocycle name</label>
          <input
            id="mesocycle-name"
            v-model="name"
            type="text"
            placeholder="e.g. Push Pull Legs — Spring block"
            class="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-chalk placeholder:text-mist/60 outline-none focus-visible:border-brass"
          />
        </div>

        <div class="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
          <label for="week-count" class="text-sm font-medium text-mist">Total weeks</label>
          <input
            id="week-count"
            v-model.number="weekCount"
            type="number"
            min="1"
            class="w-24 rounded-lg border border-line bg-surface-raised px-3 py-2 text-base text-chalk outline-none focus-visible:border-brass"
          />
          <p class="text-sm text-mist">Week {{ weekCount }} will be a deload.</p>
        </div>

        <div class="flex flex-col gap-4">
          <p class="text-sm text-mist">
            These exercises repeat every week of the mesocycle, including the deload week.
          </p>

          <div
            v-for="(workout, workoutIndex) in workouts"
            :key="workout.key"
            class="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3"
          >
            <div class="flex items-center gap-2">
              <input
                v-model="workout.name"
                type="text"
                :placeholder="`Day ${workoutIndex + 1} name (e.g. Push)`"
                class="flex-1 rounded-lg border border-line bg-surface-raised px-3 py-2 text-base text-chalk placeholder:text-mist/60 outline-none focus-visible:border-brass"
              />
              <AppButton variant="ghost" @click="removeWorkout(workout.key)">Remove</AppButton>
            </div>

            <div
              v-for="exercise in workout.exercises"
              :key="exercise.key"
              class="flex items-center gap-2"
            >
              <ExercisePicker v-model="exercise.exerciseId" class="flex-1" />
              <AppButton variant="ghost" @click="removeExercise(workout, exercise.key)"
                >✕</AppButton
              >
            </div>

            <AppButton variant="secondary" @click="addExercise(workout)">Add exercise</AppButton>
          </div>

          <AppButton variant="secondary" @click="addWorkout">Add workout</AppButton>
        </div>

        <p v-if="errorMessage" class="text-sm text-ember" role="alert">{{ errorMessage }}</p>

        <AppButton :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save mesocycle' }}
        </AppButton>
      </template>
    </main>

    <AppConfirmDialog
      :open="showReplaceConfirm"
      title="Replace your current mesocycle?"
      message="This will end your current mesocycle. Continue?"
      @confirm="confirmReplace"
      @cancel="showReplaceConfirm = false"
    />
  </div>
</template>
