<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useExercisesStore, type Exercise } from '@/stores/exercises'
import AppBottomSheet from '@/components/AppBottomSheet.vue'
import AppButton from '@/components/AppButton.vue'

const props = defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const exercisesStore = useExercisesStore()
const isOpen = ref(false)
const search = ref('')

onMounted(() => {
  exercisesStore.fetchExercises()
})

const selected = computed(() =>
  exercisesStore.exercises.find((exercise) => exercise.id === props.modelValue),
)

const filtered = computed(() =>
  exercisesStore.exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
)

const grouped = computed(() => {
  const groups = new Map<string, Exercise[]>()
  for (const exercise of filtered.value) {
    const list = groups.get(exercise.muscle_group) ?? []
    list.push(exercise)
    groups.set(exercise.muscle_group, list)
  }
  return groups
})

function select(exerciseId: string) {
  emit('update:modelValue', exerciseId)
  isOpen.value = false
  search.value = ''
}
</script>

<template>
  <div>
    <button
      type="button"
      class="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-left text-sm text-chalk transition-colors hover:border-brass/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40"
      @click="isOpen = true"
    >
      {{ selected?.name ?? 'Select exercise' }}
    </button>

    <AppBottomSheet v-model:open="isOpen">
      <input
        v-model="search"
        type="text"
        placeholder="Search exercises…"
        class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-chalk placeholder:text-mist/60 outline-none focus-visible:border-brass"
      />
      <div class="flex-1 overflow-y-auto">
        <div v-for="[group, exercises] in grouped" :key="group" class="mb-3">
          <p class="mb-1 px-1 text-xs font-semibold tracking-wide text-mist uppercase">
            {{ group }}
          </p>
          <button
            v-for="exercise in exercises"
            :key="exercise.id"
            type="button"
            class="block w-full rounded-lg px-3 py-2 text-left text-sm text-chalk transition-colors hover:bg-surface-raised"
            @click="select(exercise.id)"
          >
            {{ exercise.name }}
          </button>
        </div>
        <p v-if="filtered.length === 0" class="px-1 py-4 text-center text-sm text-mist">
          No exercises found.
        </p>
      </div>
      <AppButton variant="ghost" @click="isOpen = false">Close</AppButton>
    </AppBottomSheet>
  </div>
</template>
