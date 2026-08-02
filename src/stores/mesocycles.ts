import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'

export interface Mesocycle {
  id: string
  name: string
  created_at: string
}

export const useMesocyclesStore = defineStore('mesocycles', () => {
  const mesocycles = ref<Mesocycle[]>([])
  const loading = ref(false)

  async function fetchMesocycles() {
    const auth = useAuthStore()
    if (!auth.user) return

    loading.value = true

    const { data } = await supabase
      .from('mesocycles')
      .select('id,name,created_at')
      .eq('created_by', auth.user.id)
      .order('created_at', { ascending: false })

    mesocycles.value = data ?? []
    loading.value = false
  }

  return { mesocycles, loading, fetchMesocycles }
})
