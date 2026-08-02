<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/utils/supabase'
import PlateMark from '@/components/PlateMark.vue'

const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  const { data, error } = await supabase.auth.getSession()

  if (error || !data.session) {
    router.replace({ name: '/login' })
    return
  }

  auth.session = data.session
  router.replace({ name: '/' })
})
</script>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-center gap-5 px-6">
    <PlateMark />
    <p class="text-sm text-mist">Signing you in…</p>
  </div>
</template>
