import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export interface Exercise {
  id: string
  name: string
  muscle_group: string
  equipment: string
}

export const useExercisesStore = defineStore('exercises', () => {
  const exercises = ref<Exercise[]>([])
  const loaded = ref(false)

  async function fetchExercises() {
    if (loaded.value) return

    const { data } = await supabase
      .from('exercises')
      .select('id,name,muscle_group,equipment')
      .order('name')

    exercises.value = data ?? []
    loaded.value = true
  }

  async function createExercise(input: {
    name: string
    muscleGroup: string
    equipment: string
    createdBy: string | null
    isCustom: boolean
  }) {
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        name: input.name,
        muscle_group: input.muscleGroup,
        equipment: input.equipment,
        created_by: input.createdBy,
        is_custom: input.isCustom,
      })
      .select('id,name,muscle_group,equipment')
      .single()

    if (error) return { data: null, error }
    exercises.value.push(data)
    return { data, error: null }
  }

  return { exercises, loaded, fetchExercises, createExercise }
})
