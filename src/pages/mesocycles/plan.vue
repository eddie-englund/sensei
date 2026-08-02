<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import { useMesocyclesStore } from '@/stores/mesocycles'
import AppButton from '@/components/AppButton.vue'

interface Template {
  id: string
  name: string
  description: string | null
}

const router = useRouter()
const mesocycles = useMesocyclesStore()
const templates = ref<Template[]>([])

onMounted(async () => {
  mesocycles.fetchMesocycles()

  const { data } = await supabase
    .from('mesocycle_templates')
    .select('id,name,description')
    .order('name')

  templates.value = data ?? []
})

function startFromScratch() {
  router.push({ name: '/mesocycles/build' })
}

function startFromTemplate(templateId: string) {
  router.push({ name: '/mesocycles/build', query: { template: templateId } })
}

function startFromClone(mesocycleId: string) {
  router.push({ name: '/mesocycles/build', query: { clone: mesocycleId } })
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <header class="flex items-center gap-3 border-b border-line px-5 py-4">
      <AppButton variant="ghost" @click="router.back()">Back</AppButton>
      <h1 class="font-sans font-bold text-lg tracking-tight text-chalk">Plan mesocycle</h1>
    </header>

    <main class="flex flex-1 flex-col gap-8 px-5 py-6">
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold tracking-wide text-mist uppercase">Start from scratch</h2>
        <button
          type="button"
          class="rounded-xl border border-dashed border-line px-4 py-5 text-left text-sm transition-colors hover:border-brass/60"
          @click="startFromScratch"
        >
          <p class="font-medium text-chalk">Blank mesocycle</p>
          <p class="text-mist">Build every week, workout, and exercise yourself.</p>
        </button>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold tracking-wide text-mist uppercase">Predefined templates</h2>
        <div class="flex flex-col gap-2">
          <button
            v-for="template in templates"
            :key="template.id"
            type="button"
            class="rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-brass/60"
            @click="startFromTemplate(template.id)"
          >
            <p class="font-medium text-chalk">{{ template.name }}</p>
            <p class="text-sm text-mist">{{ template.description }}</p>
          </button>
          <p v-if="templates.length === 0" class="text-sm text-mist">No templates available yet.</p>
        </div>
      </section>

      <section v-if="mesocycles.mesocycles.length > 0" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold tracking-wide text-mist uppercase">Your mesocycles</h2>
        <div class="flex flex-col gap-2">
          <button
            v-for="mesocycle in mesocycles.mesocycles"
            :key="mesocycle.id"
            type="button"
            class="rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-brass/60"
            @click="startFromClone(mesocycle.id)"
          >
            <p class="font-medium text-chalk">{{ mesocycle.name }}</p>
            <p class="text-sm text-mist">Duplicate this mesocycle as a starting point</p>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>
