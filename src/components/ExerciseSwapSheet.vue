<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import ExercisePicker from '@/components/ExercisePicker.vue'

const props = defineProps<{
  exerciseName: string
  currentExerciseId: string
  hasLoggedSets: boolean
}>()

const emit = defineEmits<{
  swap: [{ newExerciseId: string; scope: 'week' | 'mesocycle' }]
}>()

const open = defineModel<boolean>('open', { default: false })

const selectedExerciseId = ref<string | null>(null)
const scope = ref<'week' | 'mesocycle'>('week')
const showConfirm = ref(false)

const canSwap = computed(
  () => selectedExerciseId.value !== null && selectedExerciseId.value !== props.currentExerciseId,
)

function close() {
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    selectedExerciseId.value = null
    scope.value = 'week'
    showConfirm.value = false
  }
})

function performSwap() {
  if (!selectedExerciseId.value) return
  emit('swap', { newExerciseId: selectedExerciseId.value, scope: scope.value })
  close()
}

function attemptSwap() {
  if (!canSwap.value) return
  if (props.hasLoggedSets) {
    showConfirm.value = true
    return
  }
  performSwap()
}

function confirmSwap() {
  showConfirm.value = false
  performSwap()
}

onKeyStroke('Escape', close)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-40 bg-ink/70" @click="close" />
    <section
      v-if="open"
      class="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-5 rounded-t-2xl border-t border-line bg-surface px-5 py-5"
    >
      <div class="flex items-center justify-between">
        <span class="font-sans font-bold text-base tracking-tight text-chalk">
          Swap {{ exerciseName }}
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

      <ExercisePicker v-model="selectedExerciseId" />

      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-2 text-sm text-chalk">
          <input v-model="scope" type="radio" value="week" class="h-4 w-4 accent-brass" />
          This week only
        </label>
        <label class="flex items-center gap-2 text-sm text-chalk">
          <input v-model="scope" type="radio" value="mesocycle" class="h-4 w-4 accent-brass" />
          This week and the rest of the mesocycle
        </label>
      </div>

      <AppButton :disabled="!canSwap" @click="attemptSwap">Swap exercise</AppButton>
    </section>
  </Teleport>

  <AppConfirmDialog
    :open="showConfirm"
    title="Swap exercise?"
    message="Sets already logged for this exercise will be cleared."
    confirm-label="Swap exercise"
    @confirm="confirmSwap"
    @cancel="showConfirm = false"
  />
</template>
