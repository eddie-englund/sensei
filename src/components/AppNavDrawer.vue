<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'

const open = defineModel<boolean>('open', { default: false })

const router = useRouter()
const auth = useAuthStore()

function close() {
  open.value = false
}

function goTo(name: '/mesocycles/plan' | '/workouts/list') {
  router.push({ name })
  close()
}

function signOut() {
  auth.signOut()
  close()
}

onKeyStroke('Escape', close)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40 bg-ink/70" @click="close" />
    <aside
      v-if="open"
      class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-r border-line bg-surface px-3 py-5"
    >
      <div class="mb-4 flex items-center justify-between px-2">
        <span class="font-sans font-bold text-base tracking-tight text-chalk">Sensei</span>
        <AppButton variant="icon" aria-label="Close menu" @click="close">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </AppButton>
      </div>

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
    </aside>
  </Teleport>
</template>
