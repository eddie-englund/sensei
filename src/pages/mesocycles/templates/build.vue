<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'
import ExercisePicker from '@/components/ExercisePicker.vue'

interface BuilderExercise {
  key: string
  exerciseId: string | null
  targetSets: number
}

interface BuilderWorkout {
  key: string
  name: string
  exercises: BuilderExercise[]
}

const router = useRouter()
const auth = useAuthStore()

const name = ref('')
const description = ref('')
const weekCount = ref(4)
const saving = ref(false)
const errorMessage = ref('')

function newExercise(): BuilderExercise {
  return { key: crypto.randomUUID(), exerciseId: null, targetSets: 2 }
}

function newWorkout(): BuilderWorkout {
  return { key: crypto.randomUUID(), name: '', exercises: [newExercise()] }
}

const workouts = ref<BuilderWorkout[]>([newWorkout()])

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

async function save() {
  errorMessage.value = ''

  if (!name.value.trim()) {
    errorMessage.value = 'Name your template before saving.'
    return
  }
  if (weekCount.value < 1) {
    errorMessage.value = 'A template needs at least one week.'
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
  const hasInvalidTargetSets = workouts.value.some((workout) =>
    workout.exercises.some((exercise) => exercise.targetSets < 1),
  )
  if (hasInvalidTargetSets) {
    errorMessage.value = 'Target sets must be at least 1 for every exercise.'
    return
  }

  await persistTemplate()
}

async function persistTemplate() {
  saving.value = true
  let templateId: string | null = null

  try {
    const { data: template, error: templateError } = await supabase
      .from('mesocycle_templates')
      .insert({
        name: name.value.trim(),
        description: description.value.trim() || null,
        created_by: auth.user!.id,
      })
      .select('id')
      .single()

    if (templateError || !template) throw templateError ?? new Error('Could not create template.')
    templateId = template.id

    const weekRows = Array.from({ length: weekCount.value }, (_, weekIndex) => ({
      mesocycle_template_id: templateId,
      week_number: weekIndex + 1,
      is_deload: weekIndex === weekCount.value - 1,
    }))

    const { data: insertedWeeks, error: weeksError } = await supabase
      .from('mesocycle_template_weeks')
      .insert(weekRows)
      .select('id,week_number')

    if (weeksError || !insertedWeeks) throw weeksError ?? new Error('Could not create weeks.')

    const weekIdByNumber = new Map<number, string>(
      insertedWeeks.map((week) => [week.week_number, week.id]),
    )

    const workoutRows = Array.from({ length: weekCount.value }, (_, weekIndex) =>
      workouts.value.map((workout, workoutIndex) => ({
        mesocycle_template_week_id: weekIdByNumber.get(weekIndex + 1),
        day_number: workoutIndex + 1,
        name: workout.name.trim() || `Day ${workoutIndex + 1}`,
      })),
    ).flat()

    const { data: insertedWorkouts, error: workoutsError } = await supabase
      .from('mesocycle_template_workouts')
      .insert(workoutRows)
      .select('id,mesocycle_template_week_id,day_number')

    if (workoutsError || !insertedWorkouts)
      throw workoutsError ?? new Error('Could not create workouts.')

    const workoutIdByKey = new Map<string, string>(
      insertedWorkouts.map((workout) => [
        `${workout.mesocycle_template_week_id}:${workout.day_number}`,
        workout.id,
      ]),
    )

    const exerciseRows = Array.from({ length: weekCount.value }, (_, weekIndex) => {
      const weekId = weekIdByNumber.get(weekIndex + 1)
      return workouts.value.flatMap((workout, workoutIndex) => {
        const workoutId = workoutIdByKey.get(`${weekId}:${workoutIndex + 1}`)
        return workout.exercises.map((exercise, exerciseIndex) => ({
          mesocycle_template_workout_id: workoutId,
          exercise_id: exercise.exerciseId,
          order_index: exerciseIndex,
          target_sets: exercise.targetSets,
        }))
      })
    }).flat()

    if (exerciseRows.length > 0) {
      const { error: exercisesError } = await supabase
        .from('mesocycle_template_workout_exercises')
        .insert(exerciseRows)

      if (exercisesError) throw exercisesError
    }

    router.push({ name: '/mesocycles/plan' })
  } catch (error) {
    if (templateId) {
      await supabase.from('mesocycle_templates').delete().eq('id', templateId)
    }
    errorMessage.value =
      error instanceof Error ? error.message : 'Could not save template. Try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <header class="flex items-center gap-3 border-b border-line px-5 py-4">
      <h1 class="font-sans font-bold text-lg tracking-tight text-chalk">Build template</h1>
    </header>

    <main class="flex flex-1 flex-col gap-6 px-5 py-6">
      <div class="flex flex-col gap-2">
        <label for="template-name" class="text-sm font-medium text-mist">Template name</label>
        <input
          id="template-name"
          v-model="name"
          type="text"
          placeholder="e.g. Push Pull Legs — Spring block"
          class="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-chalk placeholder:text-mist/60 outline-none focus-visible:border-brass"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="template-description" class="text-sm font-medium text-mist">Description</label>
        <textarea
          id="template-description"
          v-model="description"
          rows="2"
          placeholder="What is this template for?"
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
          These exercises repeat every week of the template, including the deload week. Anyone
          starting a mesocycle from this template can still change them.
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
            <input
              v-model.number="exercise.targetSets"
              type="number"
              min="1"
              aria-label="Target sets"
              class="w-16 rounded-lg border border-line bg-surface-raised px-2 py-2 text-center text-base text-chalk outline-none focus-visible:border-brass"
            />
            <AppButton variant="ghost" @click="removeExercise(workout, exercise.key)">✕</AppButton>
          </div>

          <AppButton variant="secondary" @click="addExercise(workout)">Add exercise</AppButton>
        </div>

        <AppButton variant="secondary" @click="addWorkout">Add workout</AppButton>
      </div>

      <p v-if="errorMessage" class="text-sm text-ember" role="alert">{{ errorMessage }}</p>

      <AppButton :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save template' }}
      </AppButton>
    </main>
  </div>
</template>
