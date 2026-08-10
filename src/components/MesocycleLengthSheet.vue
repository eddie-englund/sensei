<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWorkoutsStore } from '@/stores/workouts'
import AppBottomSheet from '@/components/AppBottomSheet.vue'
import AppButton from '@/components/AppButton.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'

const open = defineModel<boolean>('open', { default: false })

const workouts = useWorkoutsStore()

const draftWeekCount = ref(1)
const saving = ref(false)
const errorMessage = ref('')
const showShortenConfirm = ref(false)

function close() {
  open.value = false
}

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      draftWeekCount.value = workouts.weekSummaries.length
      errorMessage.value = ''
    }
  },
  { immediate: true },
)

function decrement() {
  if (draftWeekCount.value > 1) draftWeekCount.value -= 1
}

function increment() {
  draftWeekCount.value += 1
}

async function applyChange() {
  saving.value = true
  errorMessage.value = ''

  const { error } = await workouts.updateMesocycleLength(draftWeekCount.value)

  saving.value = false

  if (error) {
    errorMessage.value = error.message || 'Could not update mesocycle length.'
    return
  }

  close()
}

function save() {
  const currentCount = workouts.weekSummaries.length
  if (draftWeekCount.value === currentCount) return

  if (draftWeekCount.value < currentCount) {
    showShortenConfirm.value = true
    return
  }

  applyChange()
}

function confirmShorten() {
  showShortenConfirm.value = false
  applyChange()
}
</script>

<template>
  <AppBottomSheet v-model:open="open">
    <div class="flex items-center justify-between">
      <span class="font-sans font-bold text-base tracking-tight text-chalk">
        Mesocycle length
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

    <div
      class="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface-raised py-6"
    >
      <div class="flex items-center gap-6">
        <AppButton
          variant="icon"
          aria-label="Fewer weeks"
          class="h-11 w-11 border border-line text-lg"
          :disabled="draftWeekCount <= 1"
          @click="decrement"
        >
          −
        </AppButton>
        <span class="w-14 text-center font-sans text-3xl font-bold tabular-nums text-chalk">
          {{ draftWeekCount }}
        </span>
        <AppButton
          variant="icon"
          aria-label="More weeks"
          class="h-11 w-11 border border-line text-lg"
          @click="increment"
        >
          +
        </AppButton>
      </div>
      <p class="text-sm text-mist">
        {{ draftWeekCount === 1 ? 'week' : 'weeks' }} · Week {{ draftWeekCount }} will be a deload.
      </p>
    </div>

    <p v-if="errorMessage" class="text-sm text-ember" role="alert">{{ errorMessage }}</p>

    <AppButton :disabled="saving || draftWeekCount === workouts.weekSummaries.length" @click="save">
      {{ saving ? 'Saving…' : 'Save' }}
    </AppButton>
  </AppBottomSheet>

  <AppConfirmDialog
    :open="showShortenConfirm"
    title="Shorten mesocycle?"
    :message="`This deletes week${workouts.weekSummaries.length - draftWeekCount > 1 ? 's' : ''} ${draftWeekCount + 1}–${workouts.weekSummaries.length} and any logged sets in them.`"
    confirm-label="Delete weeks"
    @confirm="confirmShorten"
    @cancel="showShortenConfirm = false"
  />
</template>
