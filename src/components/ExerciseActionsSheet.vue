<script setup lang="ts">
import AppBottomSheet from '@/components/AppBottomSheet.vue'
import AppButton from '@/components/AppButton.vue'

defineProps<{ exerciseName: string }>()
const emit = defineEmits<{ 'view-history': []; swap: [] }>()
const open = defineModel<boolean>('open', { default: false })

function close() {
  open.value = false
}

function chooseViewHistory() {
  close()
  emit('view-history')
}

function chooseSwap() {
  close()
  emit('swap')
}
</script>

<template>
  <AppBottomSheet v-model:open="open">
    <div class="mb-2 flex items-center justify-between">
      <span class="font-sans font-bold text-base tracking-tight text-chalk">
        {{ exerciseName }}
      </span>
      <AppButton variant="icon" aria-label="Close" @click="close">
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
      class="rounded-lg px-3 py-3 text-left text-base text-chalk transition-colors hover:bg-surface-raised hover:text-brass"
      @click="chooseViewHistory"
    >
      View history
    </button>

    <button
      type="button"
      class="rounded-lg px-3 py-3 text-left text-base text-chalk transition-colors hover:bg-surface-raised hover:text-brass"
      @click="chooseSwap"
    >
      Swap exercise
    </button>
  </AppBottomSheet>
</template>
