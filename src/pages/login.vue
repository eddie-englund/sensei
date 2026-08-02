<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import PlateMark from '@/components/PlateMark.vue'
import AppButton from '@/components/AppButton.vue'

const auth = useAuthStore()

const email = ref('')
const status = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const errorMessage = ref('')

async function handleSubmit() {
  status.value = 'sending'
  errorMessage.value = ''

  const { error } = await auth.signInWithOtp(email.value)

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  status.value = 'sent'
}
</script>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-center gap-10 px-6 py-12">
    <div class="flex flex-col items-center gap-5">
      <PlateMark />
      <div class="flex flex-col items-center gap-1.5 text-center">
        <h1 class="font-sans font-extrabold text-3xl tracking-tight text-chalk">Sensei</h1>
        <p class="text-sm text-mist">Mesocycle training log</p>
      </div>
    </div>

    <div class="w-full max-w-sm">
      <form v-if="status !== 'sent'" class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-2">
          <label for="email" class="text-sm font-medium text-mist">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            inputmode="email"
            placeholder="you@example.com"
            class="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-chalk placeholder:text-mist/60 outline-none transition-colors focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/40"
          />
        </div>

        <AppButton type="submit" :disabled="status === 'sending'" class="w-full">
          {{ status === 'sending' ? 'Sending…' : 'Email me a sign-in link' }}
        </AppButton>

        <p v-if="status === 'error'" class="text-sm text-ember" role="alert">
          {{ errorMessage }}
        </p>
      </form>

      <div v-else class="flex flex-col items-center gap-2 text-center">
        <p class="text-base font-medium text-chalk">Link sent</p>
        <p class="text-sm text-mist">
          Check <span class="text-chalk">{{ email }}</span> for a link to sign in.
        </p>
      </div>
    </div>
  </div>
</template>
