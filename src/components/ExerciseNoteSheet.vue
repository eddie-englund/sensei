<script setup lang="ts">
import { ref, watch } from 'vue'
import AppBottomSheet from '@/components/AppBottomSheet.vue'
import AppButton from '@/components/AppButton.vue'

const props = defineProps<{
  exerciseName: string
  initialContent: string
  initialPinned: boolean
}>()

const emit = defineEmits<{
  save: [{ content: string; pinned: boolean }]
}>()

const open = defineModel<boolean>('open', { default: false })

const draftContent = ref('')
const draftPinned = ref(false)

function close() {
  open.value = false
}

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      draftContent.value = props.initialContent
      draftPinned.value = props.initialPinned
    }
  },
  { immediate: true },
)

function save() {
  emit('save', { content: draftContent.value, pinned: draftPinned.value })
  close()
}
</script>

<template>
  <AppBottomSheet v-model:open="open">
    <div class="flex items-center justify-between">
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

    <textarea
      v-model="draftContent"
      maxlength="500"
      rows="4"
      placeholder="Note for this exercise…"
      class="resize-none rounded-lg border border-line bg-surface-raised px-3 py-2 text-base text-chalk placeholder:text-mist/60 outline-none focus-visible:border-brass"
    />

    <label class="flex items-center gap-2 text-sm text-chalk">
      <input v-model="draftPinned" type="checkbox" class="h-4 w-4 accent-brass" />
      Pin to exercise — show every week
    </label>

    <AppButton @click="save">Save</AppButton>
  </AppBottomSheet>
</template>
