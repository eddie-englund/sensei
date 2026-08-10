<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useExercisesStore, type Exercise } from '@/stores/exercises'
import AppBottomSheet from '@/components/AppBottomSheet.vue'
import AppButton from '@/components/AppButton.vue'

const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'forearms',
] as const

const EQUIPMENT_TYPES = [
  'free-weight',
  'cable',
  'machine',
  'bodyweight',
  'bodyweight-loadable',
  'other',
] as const

function label(value: string) {
  return value
    .split('-')
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')
}

const emit = defineEmits<{ created: [Exercise] }>()

const open = defineModel<boolean>('open', { default: false })

const auth = useAuthStore()
const exercisesStore = useExercisesStore()

const draftName = ref('')
const draftMuscleGroup = ref<string>(MUSCLE_GROUPS[0])
const draftEquipment = ref<string>(EQUIPMENT_TYPES[0])
const draftAppWide = ref(false)
const saving = ref(false)
const errorMessage = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    draftName.value = ''
    draftMuscleGroup.value = MUSCLE_GROUPS[0]
    draftEquipment.value = EQUIPMENT_TYPES[0]
    draftAppWide.value = false
    errorMessage.value = ''
  }
})

function close() {
  open.value = false
}

async function save() {
  const name = draftName.value.trim()
  if (!name) {
    errorMessage.value = 'Enter a name.'
    return
  }

  const appWide = auth.isAdmin && draftAppWide.value

  saving.value = true
  errorMessage.value = ''

  const { data, error } = await exercisesStore.createExercise({
    name,
    muscleGroup: draftMuscleGroup.value,
    equipment: draftEquipment.value,
    createdBy: appWide ? null : auth.user!.id,
    isCustom: !appWide,
  })

  saving.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  emit('created', data)
  close()
}
</script>

<template>
  <AppBottomSheet v-model:open="open">
    <div class="flex items-center justify-between">
      <span class="font-sans font-bold text-base tracking-tight text-chalk">
        Add custom exercise
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

    <input
      v-model="draftName"
      type="text"
      placeholder="Exercise name"
      class="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-base text-chalk placeholder:text-mist/60 outline-none focus-visible:border-brass"
    />

    <select
      v-model="draftMuscleGroup"
      class="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-base text-chalk outline-none focus-visible:border-brass"
    >
      <option v-for="group in MUSCLE_GROUPS" :key="group" :value="group">
        {{ label(group) }}
      </option>
    </select>

    <select
      v-model="draftEquipment"
      class="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-base text-chalk outline-none focus-visible:border-brass"
    >
      <option v-for="equipment in EQUIPMENT_TYPES" :key="equipment" :value="equipment">
        {{ label(equipment) }}
      </option>
    </select>

    <label v-if="auth.isAdmin" class="flex items-center gap-2 text-sm text-chalk">
      <input v-model="draftAppWide" type="checkbox" class="h-4 w-4 accent-brass" />
      Add as app-wide exercise
    </label>

    <p v-if="errorMessage" class="text-sm text-red-400">{{ errorMessage }}</p>

    <AppButton :disabled="saving" @click="save">
      {{ saving ? 'Adding…' : 'Add exercise' }}
    </AppButton>
  </AppBottomSheet>
</template>
