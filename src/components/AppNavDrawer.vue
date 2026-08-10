<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import AppButton from '@/components/AppButton.vue'
import AppNavLinks from '@/components/AppNavLinks.vue'

const open = defineModel<boolean>('open', { default: false })

function close() {
  open.value = false
}

onKeyStroke('Escape', close)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40 bg-ink/70 lg:hidden" @click="close" />
    <aside
      v-if="open"
      class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-1 border-r border-line bg-surface px-3 py-5 lg:hidden"
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

      <AppNavLinks @navigate="close" />
    </aside>
  </Teleport>
</template>
