<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppButton from '@/components/AppButton.vue'
import AppNavDrawer from '@/components/AppNavDrawer.vue'

const auth = useAuthStore()
const drawerOpen = ref(false)
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <template v-if="auth.isAuthenticated">
      <header class="flex items-center gap-3 border-b border-line px-5 py-4">
        <AppButton variant="icon" aria-label="Menu" @click="drawerOpen = true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </AppButton>
        <span class="font-sans font-bold text-lg tracking-tight text-chalk">Sensei</span>
      </header>
      <AppNavDrawer v-model:open="drawerOpen" />
    </template>

    <div class="flex flex-1 flex-col min-h-0">
      <slot />
    </div>
  </div>
</template>
