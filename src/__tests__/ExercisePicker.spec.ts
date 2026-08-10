import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, DOMWrapper, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ExercisePicker from '../components/ExercisePicker.vue'
import { useAuthStore } from '../stores/auth'
import { useExercisesStore } from '../stores/exercises'

const { insertMock, selectMock, singleMock } = vi.hoisted(() => ({
  insertMock: vi.fn<(row: unknown) => void>(),
  selectMock: vi.fn<() => { single: () => Promise<{ data: unknown; error: Error | null }> }>(),
  singleMock: vi.fn<() => Promise<{ data: unknown; error: Error | null }>>(),
}))

vi.mock('@/utils/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'exercises') throw new Error(`unexpected table ${table}`)
      return {
        insert: (row: unknown) => {
          insertMock(row)
          return { select: selectMock }
        },
      }
    },
  },
}))

const body = new DOMWrapper(document.body)
let activeWrapper: VueWrapper | null = null

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = null
  document.body.innerHTML = ''
  insertMock.mockReset()
  selectMock.mockReset()
  singleMock.mockReset()
})

function mountPicker() {
  const pinia = createPinia()
  const auth = useAuthStore(pinia)
  // @ts-expect-error partial session is enough for auth.user.id in this test
  auth.session = { user: { id: 'user-1' } }

  const exercises = useExercisesStore(pinia)
  exercises.exercises = [
    { id: 'e-bench', name: 'Bench Press', muscle_group: 'chest', equipment: 'other' },
  ]
  exercises.loaded = true

  const wrapper = mount(ExercisePicker, {
    global: { plugins: [pinia] },
    props: { modelValue: null },
  })
  activeWrapper = wrapper
  return wrapper
}

describe('ExercisePicker add custom exercise', () => {
  it('shows an always-visible "Add custom exercise" row in the list', async () => {
    const wrapper = mountPicker()
    await wrapper.find('button').trigger('click')

    expect(body.findAll('button').find((b) => b.text() === '+ Add custom exercise')).toBeTruthy()
  })

  it('creating a custom exercise selects it and closes both sheets', async () => {
    selectMock.mockReturnValue({ single: singleMock })
    singleMock.mockResolvedValue({
      data: { id: 'e-new', name: 'Nordic Curl', muscle_group: 'hamstrings', equipment: 'other' },
      error: null,
    })
    const wrapper = mountPicker()

    await wrapper.find('button').trigger('click')
    const addRow = body.findAll('button').find((b) => b.text() === '+ Add custom exercise')!
    await addRow.trigger('click')

    await body.find('input[placeholder="Exercise name"]').setValue('Nordic Curl')
    const saveButton = body.findAll('button').find((b) => b.text() === 'Add exercise')!
    await saveButton.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([['e-new']])
    expect(body.find('section').exists()).toBe(false)
  })
})
