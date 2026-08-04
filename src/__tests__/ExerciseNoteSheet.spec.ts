import { describe, it, expect, afterEach } from 'vitest'
import { mount, DOMWrapper, type VueWrapper } from '@vue/test-utils'
import ExerciseNoteSheet from '../components/ExerciseNoteSheet.vue'

const body = new DOMWrapper(document.body)
let activeWrapper: VueWrapper | null = null

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = null
  document.body.innerHTML = ''
})

function mountSheet(props: {
  open: boolean
  exerciseName?: string
  initialContent?: string
  initialPinned?: boolean
}) {
  const wrapper = mount(ExerciseNoteSheet, {
    props: {
      exerciseName: 'Bench Press',
      initialContent: '',
      initialPinned: false,
      ...props,
    },
  })
  activeWrapper = wrapper
  return wrapper
}

describe('ExerciseNoteSheet', () => {
  it('renders nothing when closed', () => {
    mountSheet({ open: false })
    expect(body.find('textarea').exists()).toBe(false)
  })

  it('seeds the draft from initial props when opened', () => {
    mountSheet({ open: true, initialContent: 'Keep elbows tucked', initialPinned: true })
    expect(body.find('textarea').element.value).toBe('Keep elbows tucked')
    const checkbox = body.find<HTMLInputElement>('input[type="checkbox"]')
    expect(checkbox.element.checked).toBe(true)
    expect(body.text()).toContain('Bench Press')
  })

  it('emits save with the edited content and pinned flag, then closes', async () => {
    const wrapper = mountSheet({ open: true, initialContent: 'old', initialPinned: false })

    await body.find('textarea').setValue('new note')
    await body.find('input[type="checkbox"]').setValue(true)

    const saveButton = body.findAll('button').find((b) => b.text() === 'Save')!
    await saveButton.trigger('click')

    expect(wrapper.emitted('save')).toEqual([[{ content: 'new note', pinned: true }]])
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('closes on Escape without emitting save', async () => {
    const wrapper = mountSheet({ open: true })
    await body.find('section').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('save')).toBeUndefined()
  })
})
