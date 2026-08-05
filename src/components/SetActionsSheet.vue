<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import AppButton from '@/components/AppButton.vue'
import type { SetMarker } from '@/stores/workouts'

const props = defineProps<{
  setNumber: number
  isSkipped: boolean
  isLogged: boolean
  isTrailingSet: boolean
  marker: SetMarker | null
}>()

const emit = defineEmits<{
  skip: []
  unskip: []
  remove: []
  'set-marker': [SetMarker | null]
}>()

const open = defineModel<boolean>('open', { default: false })

function close() {
  open.value = false
}

function chooseSkip() {
  close()
  emit('skip')
}

function chooseUnskip() {
  close()
  emit('unskip')
}

function chooseRemove() {
  close()
  emit('remove')
}

function chooseMarker(marker: SetMarker) {
  close()
  emit('set-marker', marker)
}

onKeyStroke('Escape', close)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40 bg-ink/70" @click="close" />
    <section
      v-if="open"
      class="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 rounded-t-2xl border-t border-line bg-surface px-5 py-5"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="font-sans font-bold text-base tracking-tight text-chalk">
          Set {{ setNumber }}
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
        v-if="!props.isLogged && !props.isSkipped"
        type="button"
        class="rounded-lg px-3 py-3 text-left text-base text-chalk transition-colors hover:bg-surface-raised hover:text-brass"
        @click="chooseSkip"
      >
        Skip set
      </button>

      <button
        v-if="props.isSkipped"
        type="button"
        class="rounded-lg px-3 py-3 text-left text-base text-chalk transition-colors hover:bg-surface-raised hover:text-brass"
        @click="chooseUnskip"
      >
        Unskip set
      </button>

      <button
        v-if="props.isTrailingSet && !props.isLogged"
        type="button"
        class="rounded-lg px-3 py-3 text-left text-base font-medium text-ember transition-colors hover:bg-surface-raised"
        @click="chooseRemove"
      >
        Remove set
      </button>

      <button
        type="button"
        class="flex items-center justify-between rounded-lg px-3 py-3 text-left text-base text-chalk transition-colors hover:bg-surface-raised hover:text-brass"
        @click="chooseMarker('myrep')"
      >
        Myrep
        <svg
          v-if="props.marker === 'myrep'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4 text-brass"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </button>

      <button
        type="button"
        class="flex items-center justify-between rounded-lg px-3 py-3 text-left text-base text-chalk transition-colors hover:bg-surface-raised hover:text-brass"
        @click="chooseMarker('myrep_match')"
      >
        Myrep match
        <svg
          v-if="props.marker === 'myrep_match'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4 text-brass"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </section>
  </Teleport>
</template>
