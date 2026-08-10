<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'

const open = defineModel<boolean>('open', { default: false })

withDefaults(defineProps<{ maxWidthClass?: string }>(), { maxWidthClass: 'sm:max-w-sm' })

onKeyStroke('Escape', () => {
  open.value = false
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 sm:items-center"
      @click.self="open = false"
    >
      <section
        :class="maxWidthClass"
        class="flex max-h-[85vh] w-full flex-col gap-5 rounded-t-2xl border-t border-line bg-surface px-5 py-5 sm:rounded-2xl sm:border"
      >
        <slot />
      </section>
    </div>
  </Teleport>
</template>
