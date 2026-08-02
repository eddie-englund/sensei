<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'icon'
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'primary', type: 'button', disabled: false },
)

const variantClasses = {
  primary:
    'rounded-xl bg-brass px-4 py-3 text-base font-semibold text-ink hover:bg-brass-dim focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
  secondary:
    'rounded-xl border border-line px-4 py-3 text-base font-semibold text-chalk hover:border-brass/60 hover:text-brass',
  ghost: 'rounded-lg px-3 py-1.5 text-sm text-mist hover:text-chalk',
  icon: 'inline-flex items-center justify-center rounded-full p-2 text-mist hover:bg-surface hover:text-brass',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="outline-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40 disabled:cursor-not-allowed disabled:opacity-60"
    :class="variantClasses[variant]"
  >
    <slot />
  </button>
</template>
