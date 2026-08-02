<script setup lang="ts">
const bars = [
  { width: 'w-5', color: 'bg-mist' },
  { width: 'w-9', color: 'bg-brass' },
  { width: 'w-13', color: 'bg-brass' },
  { width: 'w-17', color: 'bg-brass-dim' },
]
</script>

<template>
  <div class="flex flex-col items-center gap-1.5" aria-hidden="true">
    <span
      v-for="(bar, i) in bars"
      :key="i"
      class="h-2 rounded-full animate-plate-drop"
      :class="[bar.width, bar.color]"
      :style="{ animationDelay: `${i * 90}ms` }"
    />
  </div>
</template>
