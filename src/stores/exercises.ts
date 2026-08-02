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

  return { exercises, loaded, fetchExercises }
})
