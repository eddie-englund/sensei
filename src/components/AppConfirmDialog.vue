<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
  }>(),
  { confirmLabel: 'Continue', cancelLabel: 'Cancel' },
)

defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40 bg-ink/70" @click="$emit('cancel')" />
    <div
      v-if="open"
      role="alertdialog"
      aria-modal="true"
      class="fixed inset-x-4 top-1/3 z-50 flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2"
    >
      <div class="flex flex-col gap-1.5">
        <p class="text-base font-semibold text-chalk">{{ title }}</p>
        <p class="text-sm text-mist">{{ message }}</p>
      </div>
      <div class="flex justify-end gap-2">
        <AppButton variant="secondary" @click="$emit('cancel')">{{ cancelLabel }}</AppButton>
        <AppButton @click="$emit('confirm')">{{ confirmLabel }}</AppButton>
      </div>
    </div>
  </Teleport>
</template>
