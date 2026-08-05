import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/utils/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const isAdmin = ref(false)

  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => session.value !== null)

  async function fetchIsAdmin(userId: string | undefined) {
    if (!userId) {
      isAdmin.value = false
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle()
    isAdmin.value = data?.is_admin ?? false
  }

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    await fetchIsAdmin(data.session?.user.id)

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      fetchIsAdmin(newSession?.user.id)
    })
  }

  async function signInWithOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, user, isAuthenticated, isAdmin, init, signInWithOtp, signOut }
})
