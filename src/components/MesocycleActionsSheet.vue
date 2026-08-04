<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkoutsStore } from '@/stores/workouts'
import AppButton from '@/components/AppButton.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'

withDefaults(defineProps<{ showEditLength?: boolean }>(), { showEditLength: false })
const emit = defineEmits<{ 'edit-length': [] }>()
const open = defineModel<boolean>('open', { default: false })

const router = useRouter()
const workouts = useWorkoutsStore()

const ending = ref(false)
const errorMessage = ref('')
const showEndConfirm = ref(false)
const showEndConfirmFinal = ref(false)

function close() {
  open.value = false
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  errorMessage.value = ''
  // Some call sites (e.g. an in-progress workout page) never need
  // activeMesocycle for their own rendering, so it may not be loaded yet.
  if (!workouts.activeMesocycle) await workouts.fetchActiveMesocycle()
})

function chooseEditLength() {
  close()
  emit('edit-length')
}

function confirmEndFirst() {
  showEndConfirm.value = false
  showEndConfirmFinal.value = true
}

async function confirmEndFinal() {
  showEndConfirmFinal.value = false
  ending.value = true
  errorMessage.value = ''

  const { error } = await workouts.endMesocycle()

  ending.value = false

  if (error) {
    errorMessage.value = error.message || 'Could not end mesocycle.'
    return
  }

  close()
  router.push({ name: '/' })
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
          Mesocycle options
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
        v-if="showEditLength"
        type="button"
        class="rounded-lg px-3 py-3 text-left text-base text-chalk transition-colors hover:bg-surface-raised hover:text-brass"
        @click="chooseEditLength"
      >
        Edit mesocycle length
      </button>

      <button
        type="button"
        class="rounded-lg px-3 py-3 text-left text-base font-medium text-ember transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="ending"
        @click="showEndConfirm = true"
      >
        {{ ending ? 'Ending…' : 'End mesocycle' }}
      </button>

      <p v-if="errorMessage" class="text-sm text-ember" role="alert">{{ errorMessage }}</p>
    </section>
  </Teleport>

  <AppConfirmDialog
    :open="showEndConfirm"
    title="End mesocycle early?"
    :message="`End ${workouts.activeMesocycle?.name ?? 'this mesocycle'} now? Any remaining workouts in it will be left incomplete.`"
    confirm-label="End mesocycle"
    @confirm="confirmEndFirst"
    @cancel="showEndConfirm = false"
  />

  <AppConfirmDialog
    :open="showEndConfirmFinal"
    title="Are you sure?"
    message="This can't be undone. You won't be able to log any more sets in this mesocycle."
    confirm-label="Yes, end it"
    @confirm="confirmEndFinal"
    @cancel="showEndConfirmFinal = false"
  />
</template>
