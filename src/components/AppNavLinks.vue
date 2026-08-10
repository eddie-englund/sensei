<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{ navigate: [] }>()

const router = useRouter()
const auth = useAuthStore()

function goTo(name: '/mesocycles/plan' | '/workouts/list') {
  router.push({ name })
  emit('navigate')
}

function signOut() {
  auth.signOut()
  emit('navigate')
}
</script>

<template>
  <button
    type="button"
    class="rounded-lg px-3 py-2.5 text-left text-base text-chalk transition-colors hover:bg-surface-raised hover:text-brass"
    @click="goTo('/mesocycles/plan')"
  >
    Plan mesocycle
  </button>
  <button
    type="button"
    class="rounded-lg px-3 py-2.5 text-left text-base text-chalk transition-colors hover:bg-surface-raised hover:text-brass"
    @click="goTo('/workouts/list')"
  >
    View workouts
  </button>

  <div class="mt-auto border-t border-line pt-3">
    <button
      type="button"
      class="w-full rounded-lg px-3 py-2.5 text-left text-base text-chalk transition-colors hover:bg-surface-raised hover:text-brass"
      @click="signOut"
    >
      Sign out
    </button>
  </div>
</template>
