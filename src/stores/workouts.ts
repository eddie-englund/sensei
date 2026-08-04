import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'

type Row = Record<string, unknown>

interface SetRow {
  set_number: number
  weight: number | null
  reps: number | null
  completed_at: string | null
}

interface WeekNoteRow {
  content: string
}

interface ExerciseRow {
  id: string
  order_index: number
  target_sets: number
  workout_sets: SetRow[]
}

interface WorkoutRow {
  id: string
  day_number: number
  name: string
  mesocycle_workout_exercises: ExerciseRow[]
}

interface WeekRow {
  id: string
  week_number: number
  is_deload: boolean
  mesocycle_workouts: WorkoutRow[]
}

interface ActiveMesocycle {
  id: string
  name: string
  clonedFromId: string | null
}

export type WorkoutStatus = 'complete' | 'current' | 'upcoming'

export interface WorkoutSummary {
  id: string
  dayNumber: number
  name: string
  status: WorkoutStatus
}

export interface WeekSummary {
  weekNumber: number
  isDeload: boolean
  workouts: WorkoutSummary[]
}

export interface SetViewModel {
  setNumber: number
  weight: number | null
  reps: number | null
  completedAt: string | null
  weightPrefill: number | null
  repsPlaceholder: number | null
}

export interface ExerciseNote {
  content: string
  pinned: boolean
}

export interface ExerciseDetail {
  id: string
  exerciseId: string
  name: string
  targetSets: number
  sets: SetViewModel[]
  note: ExerciseNote | null
}

export interface WorkoutDetail {
  id: string
  mesocycleId: string
  dayNumber: number
  name: string
  weekNumber: number
  isDeload: boolean
  complete: boolean
  exercises: ExerciseDetail[]
}

function isExerciseComplete(exercise: ExerciseRow): boolean {
  const loggedCount = exercise.workout_sets.filter((set) => set.completed_at !== null).length
  return loggedCount >= exercise.target_sets
}

function isWorkoutComplete(workout: WorkoutRow): boolean {
  return workout.mesocycle_workout_exercises.every(isExerciseComplete)
}

function sortStructure(weeks: WeekRow[]) {
  weeks.sort((a, b) => a.week_number - b.week_number)
  for (const week of weeks) {
    week.mesocycle_workouts.sort((a, b) => a.day_number - b.day_number)
    for (const workout of week.mesocycle_workouts) {
      workout.mesocycle_workout_exercises.sort((a, b) => a.order_index - b.order_index)
    }
  }
}

function findCurrentWorkout(weeks: WeekRow[]): {
  workoutId: string | null
  mesocycleComplete: boolean
} {
  for (const week of weeks) {
    for (const workout of week.mesocycle_workouts) {
      if (!isWorkoutComplete(workout)) {
        return { workoutId: workout.id, mesocycleComplete: false }
      }
    }
  }
  return { workoutId: null, mesocycleComplete: weeks.length > 0 }
}

function buildWeekSummaries(weeks: WeekRow[]): WeekSummary[] {
  const current = findCurrentWorkout(weeks)

  return weeks.map((week) => ({
    weekNumber: week.week_number,
    isDeload: week.is_deload,
    workouts: week.mesocycle_workouts.map((workout) => ({
      id: workout.id,
      dayNumber: workout.day_number,
      name: workout.name,
      status: isWorkoutComplete(workout)
        ? 'complete'
        : workout.id === current.workoutId
          ? 'current'
          : 'upcoming',
    })),
  }))
}

interface TemplateExercise {
  exercise_id: string
  order_index: number
  target_sets: number
}

interface TemplateWorkout {
  day_number: number
  name: string
  mesocycle_workout_exercises: TemplateExercise[]
}

async function fetchWeekOnePattern(mesocycleId: string): Promise<TemplateWorkout[]> {
  const { data: week1 } = await supabase
    .from('mesocycle_weeks')
    .select('id')
    .eq('mesocycle_id', mesocycleId)
    .eq('week_number', 1)
    .single()

  if (!week1) return []

  const { data } = await supabase
    .from('mesocycle_workouts')
    .select(
      'day_number, name, mesocycle_workout_exercises ( exercise_id, order_index, target_sets )',
    )
    .eq('mesocycle_week_id', week1.id)
    .order('day_number')

  return (data ?? []) as unknown as TemplateWorkout[]
}

async function lengthenMesocycle(
  mesocycleId: string,
  currentWeeks: WeekRow[],
  currentCount: number,
  newWeekCount: number,
) {
  const template = await fetchWeekOnePattern(mesocycleId)
  if (template.length === 0) return

  const oldLastWeek = currentWeeks.find((week) => week.week_number === currentCount)
  if (oldLastWeek?.is_deload) {
    await supabase.from('mesocycle_weeks').update({ is_deload: false }).eq('id', oldLastWeek.id)
  }

  const weekNumbers = Array.from(
    { length: newWeekCount - currentCount },
    (_, i) => currentCount + 1 + i,
  )

  const { data: insertedWeeks, error: weeksError } = await supabase
    .from('mesocycle_weeks')
    .insert(
      weekNumbers.map((weekNumber) => ({
        mesocycle_id: mesocycleId,
        week_number: weekNumber,
        is_deload: weekNumber === newWeekCount,
      })),
    )
    .select('id,week_number')

  if (weeksError || !insertedWeeks) throw weeksError ?? new Error('Could not add weeks.')

  const workoutRows = insertedWeeks.flatMap((week) =>
    template.map((workout) => ({
      mesocycle_week_id: week.id,
      day_number: workout.day_number,
      name: workout.name,
    })),
  )

  const { data: insertedWorkouts, error: workoutsError } = await supabase
    .from('mesocycle_workouts')
    .insert(workoutRows)
    .select('id,mesocycle_week_id,day_number')

  if (workoutsError || !insertedWorkouts)
    throw workoutsError ?? new Error('Could not add workouts.')

  const templateByDayNumber = new Map(template.map((workout) => [workout.day_number, workout]))

  const exerciseRows = insertedWorkouts.flatMap((workout) => {
    const templateWorkout = templateByDayNumber.get(workout.day_number)
    return (templateWorkout?.mesocycle_workout_exercises ?? []).map((exercise) => ({
      mesocycle_workout_id: workout.id,
      exercise_id: exercise.exercise_id,
      order_index: exercise.order_index,
      target_sets: exercise.target_sets,
    }))
  })

  if (exerciseRows.length > 0) {
    const { error: exercisesError } = await supabase
      .from('mesocycle_workout_exercises')
      .insert(exerciseRows)
    if (exercisesError) throw exercisesError
  }
}

async function shortenMesocycle(
  mesocycleId: string,
  currentWeeks: WeekRow[],
  newWeekCount: number,
) {
  const { error: deleteError } = await supabase
    .from('mesocycle_weeks')
    .delete()
    .eq('mesocycle_id', mesocycleId)
    .gt('week_number', newWeekCount)

  if (deleteError) throw deleteError

  const newLastWeek = currentWeeks.find((week) => week.week_number === newWeekCount)
  if (newLastWeek && !newLastWeek.is_deload) {
    const { error: updateError } = await supabase
      .from('mesocycle_weeks')
      .update({ is_deload: true })
      .eq('id', newLastWeek.id)
    if (updateError) throw updateError
  }
}

async function resolveReferenceWeekId(
  mesocycleId: string,
  weekNumber: number,
  clonedFromId: string | null,
): Promise<string | null> {
  if (weekNumber > 1) {
    const { data } = await supabase
      .from('mesocycle_weeks')
      .select('id')
      .eq('mesocycle_id', mesocycleId)
      .eq('week_number', weekNumber - 1)
      .maybeSingle()
    return (data?.id as string | undefined) ?? null
  }

  if (clonedFromId) {
    const { data } = await supabase
      .from('mesocycle_weeks')
      .select('id')
      .eq('mesocycle_id', clonedFromId)
      .eq('is_deload', false)
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data?.id as string | undefined) ?? null
  }

  return null
}

export const useWorkoutsStore = defineStore('workouts', () => {
  const activeMesocycle = ref<ActiveMesocycle | null>(null)
  const structure = ref<WeekRow[]>([])
  const loading = ref(false)

  const currentWorkout = computed(() => findCurrentWorkout(structure.value))
  const weekSummaries = computed(() => buildWeekSummaries(structure.value))

  async function fetchActiveMesocycle() {
    const auth = useAuthStore()
    if (!auth.user) return

    const { data } = await supabase
      .from('mesocycles')
      .select('id,name,cloned_from_id')
      .eq('created_by', auth.user.id)
      .eq('is_active', true)
      .maybeSingle()

    activeMesocycle.value = data
      ? { id: data.id, name: data.name, clonedFromId: data.cloned_from_id }
      : null
  }

  async function fetchActiveMesocycleStructure() {
    if (!activeMesocycle.value) {
      structure.value = []
      return
    }

    loading.value = true

    const { data } = await supabase
      .from('mesocycle_weeks')
      .select(
        `
        id,
        week_number,
        is_deload,
        mesocycle_workouts (
          id,
          day_number,
          name,
          mesocycle_workout_exercises (
            id,
            order_index,
            target_sets,
            workout_sets ( id, set_number, completed_at )
          )
        )
      `,
      )
      .eq('mesocycle_id', activeMesocycle.value.id)

    const weeks = (data ?? []) as unknown as WeekRow[]
    sortStructure(weeks)
    structure.value = weeks

    loading.value = false
  }

  async function fetchWorkoutDetail(workoutId: string): Promise<WorkoutDetail | null> {
    const { data: workoutRow } = await supabase
      .from('mesocycle_workouts')
      .select(
        `
        id, day_number, name,
        mesocycle_weeks (
          id, week_number, is_deload, mesocycle_id,
          mesocycles ( id, name, cloned_from_id )
        )
      `,
      )
      .eq('id', workoutId)
      .single()

    if (!workoutRow) return null

    const week = workoutRow.mesocycle_weeks as unknown as Row
    const mesocycle = week.mesocycles as unknown as Row
    const weekNumber = week.week_number as number
    const isDeload = week.is_deload as boolean
    const mesocycleId = mesocycle.id as string
    const clonedFromId = (mesocycle.cloned_from_id as string | null) ?? null

    const { data: exerciseRows } = await supabase
      .from('mesocycle_workout_exercises')
      .select(
        `
        id, exercise_id, order_index, target_sets,
        exercises ( name ),
        workout_sets ( set_number, weight, reps, completed_at ),
        exercise_week_notes ( content )
      `,
      )
      .eq('mesocycle_workout_id', workoutId)
      .order('order_index', { ascending: true })

    const exercises = (exerciseRows ?? []) as unknown as (Row & {
      exercises: Row
      workout_sets: SetRow[]
      exercise_week_notes: WeekNoteRow | null
    })[]

    const exerciseIds = [...new Set(exercises.map((exercise) => exercise.exercise_id as string))]

    const { data: pinnedNoteRows } =
      exerciseIds.length > 0
        ? await supabase
            .from('exercise_pinned_notes')
            .select('exercise_id, content')
            .eq('mesocycle_id', mesocycleId)
            .in('exercise_id', exerciseIds)
        : { data: [] }

    const pinnedByExerciseId = new Map(
      (pinnedNoteRows ?? []).map((row) => [row.exercise_id as string, row.content as string]),
    )

    const refWeekId = await resolveReferenceWeekId(mesocycleId, weekNumber, clonedFromId)

    const referenceByOrderIndex = new Map<number, Map<number, SetRow>>()

    if (refWeekId) {
      const { data: refWorkout } = await supabase
        .from('mesocycle_workouts')
        .select('id')
        .eq('mesocycle_week_id', refWeekId)
        .eq('day_number', workoutRow.day_number)
        .maybeSingle()

      if (refWorkout) {
        const { data: refExerciseRows } = await supabase
          .from('mesocycle_workout_exercises')
          .select('order_index, workout_sets ( set_number, weight, reps, completed_at )')
          .eq('mesocycle_workout_id', refWorkout.id)

        for (const refExercise of (refExerciseRows ?? []) as unknown as (Row & {
          workout_sets: SetRow[]
        })[]) {
          const setsByNumber = new Map<number, SetRow>()
          for (const set of refExercise.workout_sets) {
            if (set.completed_at !== null) {
              setsByNumber.set(set.set_number, set)
            }
          }
          referenceByOrderIndex.set(refExercise.order_index as number, setsByNumber)
        }
      }
    }

    const exerciseDetails: ExerciseDetail[] = exercises.map((exercise) => {
      const orderIndex = exercise.order_index as number
      const targetSets = exercise.target_sets as number
      const loggedByNumber = new Map<number, SetRow>()
      for (const set of exercise.workout_sets) {
        loggedByNumber.set(set.set_number, set)
      }
      const referenceSets = referenceByOrderIndex.get(orderIndex)

      const setNumbers = new Set<number>()
      for (let n = 1; n <= targetSets; n++) setNumbers.add(n)
      for (const n of loggedByNumber.keys()) setNumbers.add(n)

      const sets: SetViewModel[] = Array.from(setNumbers)
        .sort((a, b) => a - b)
        .map((setNumber) => {
          const logged = loggedByNumber.get(setNumber)
          const reference = referenceSets?.get(setNumber)
          return {
            setNumber,
            weight: logged?.weight ?? null,
            reps: logged?.reps ?? null,
            completedAt: logged?.completed_at ?? null,
            weightPrefill: logged ? null : (reference?.weight ?? null),
            repsPlaceholder:
              logged || !reference || reference.reps === null ? null : reference.reps + 1,
          }
        })

      const exerciseId = exercise.exercise_id as string
      const pinnedContent = pinnedByExerciseId.get(exerciseId)
      const weekContent = exercise.exercise_week_notes?.content
      const note: ExerciseNote | null =
        pinnedContent !== undefined
          ? { content: pinnedContent, pinned: true }
          : weekContent !== undefined
            ? { content: weekContent, pinned: false }
            : null

      return {
        id: exercise.id as string,
        exerciseId,
        name: exercise.exercises.name as string,
        targetSets,
        sets,
        note,
      }
    })

    return {
      id: workoutRow.id,
      mesocycleId,
      dayNumber: workoutRow.day_number,
      name: workoutRow.name,
      weekNumber,
      isDeload,
      complete: exercises.every((exercise) =>
        isExerciseComplete({
          id: exercise.id as string,
          order_index: exercise.order_index as number,
          target_sets: exercise.target_sets as number,
          workout_sets: exercise.workout_sets,
        }),
      ),
      exercises: exerciseDetails,
    }
  }

  async function updateMesocycleLength(newWeekCount: number) {
    if (!activeMesocycle.value) return { error: new Error('No active mesocycle.') }
    if (newWeekCount < 1) return { error: null }

    const mesocycleId = activeMesocycle.value.id
    const currentWeeks = structure.value
    const currentCount = currentWeeks.length
    if (newWeekCount === currentCount) return { error: null }

    try {
      if (newWeekCount > currentCount) {
        await lengthenMesocycle(mesocycleId, currentWeeks, currentCount, newWeekCount)
      } else {
        await shortenMesocycle(mesocycleId, currentWeeks, newWeekCount)
      }
      await fetchActiveMesocycleStructure()
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Could not update mesocycle length.'),
      }
    }
  }

  async function endMesocycle() {
    if (!activeMesocycle.value) return { error: new Error('No active mesocycle.') }

    const { error } = await supabase
      .from('mesocycles')
      .update({ is_active: false })
      .eq('id', activeMesocycle.value.id)

    if (error) return { error }

    activeMesocycle.value = null
    structure.value = []
    return { error: null }
  }

  async function logSet(input: {
    mesocycleWorkoutExerciseId: string
    setNumber: number
    weight: number
    reps: number
  }) {
    const { error } = await supabase.from('workout_sets').upsert(
      {
        mesocycle_workout_exercise_id: input.mesocycleWorkoutExerciseId,
        set_number: input.setNumber,
        weight: input.weight,
        reps: input.reps,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'mesocycle_workout_exercise_id,set_number' },
    )

    return { error }
  }

  async function addSet(mesocycleWorkoutExerciseId: string, currentTargetSets: number) {
    const targetSets = currentTargetSets + 1
    const { error } = await supabase
      .from('mesocycle_workout_exercises')
      .update({ target_sets: targetSets })
      .eq('id', mesocycleWorkoutExerciseId)

    return { targetSets: error ? null : targetSets, error }
  }

  interface ExerciseNoteInput {
    mesocycleWorkoutExerciseId: string
    mesocycleId: string
    exerciseId: string
    content: string
  }

  async function deleteExerciseNote(input: ExerciseNoteInput) {
    const { error: weekError } = await supabase
      .from('exercise_week_notes')
      .delete()
      .eq('mesocycle_workout_exercise_id', input.mesocycleWorkoutExerciseId)
    if (weekError) return { error: weekError }

    const { error: pinnedError } = await supabase
      .from('exercise_pinned_notes')
      .delete()
      .eq('mesocycle_id', input.mesocycleId)
      .eq('exercise_id', input.exerciseId)

    return { error: pinnedError }
  }

  async function saveExerciseNote(input: ExerciseNoteInput & { pinned: boolean }) {
    const content = input.content.trim()
    if (!content) return deleteExerciseNote(input)

    if (input.pinned) {
      const { error } = await supabase.from('exercise_pinned_notes').upsert(
        { mesocycle_id: input.mesocycleId, exercise_id: input.exerciseId, content },
        { onConflict: 'mesocycle_id,exercise_id' },
      )
      if (error) return { error }

      const { error: cleanupError } = await supabase
        .from('exercise_week_notes')
        .delete()
        .eq('mesocycle_workout_exercise_id', input.mesocycleWorkoutExerciseId)
      return { error: cleanupError }
    }

    const { error } = await supabase.from('exercise_week_notes').upsert(
      { mesocycle_workout_exercise_id: input.mesocycleWorkoutExerciseId, content },
      { onConflict: 'mesocycle_workout_exercise_id' },
    )
    if (error) return { error }

    const { error: cleanupError } = await supabase
      .from('exercise_pinned_notes')
      .delete()
      .eq('mesocycle_id', input.mesocycleId)
      .eq('exercise_id', input.exerciseId)
    return { error: cleanupError }
  }

  return {
    activeMesocycle,
    structure,
    loading,
    currentWorkout,
    weekSummaries,
    fetchActiveMesocycle,
    fetchActiveMesocycleStructure,
    fetchWorkoutDetail,
    logSet,
    addSet,
    saveExerciseNote,
    deleteExerciseNote,
    updateMesocycleLength,
    endMesocycle,
  }
})
