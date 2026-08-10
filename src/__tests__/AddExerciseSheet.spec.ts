import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, DOMWrapper, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import AddExerciseSheet from '../components/AddExerciseSheet.vue'
import { useAuthStore } from '../stores/auth'

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

function mountSheet({ open, isAdmin = false }: { open: boolean; isAdmin?: boolean }) {
  const pinia = createPinia()
  const auth = useAuthStore(pinia)
  // @ts-expect-error partial session is enough for auth.user.id in this test
  auth.session = { user: { id: 'user-1' } }
  auth.isAdmin = isAdmin

  const wrapper = mount(AddExerciseSheet, {
    global: { plugins: [pinia] },
    props: { open },
  })
  activeWrapper = wrapper
  return wrapper
}

describe('AddExerciseSheet', () => {
  it('renders nothing when closed', () => {
    mountSheet({ open: false })
    expect(body.find('section').exists()).toBe(false)
  })

  it('hides the app-wide checkbox for non-admins', () => {
    mountSheet({ open: true, isAdmin: false })
    expect(body.text()).not.toContain('Add as app-wide exercise')
  })

  it('shows the app-wide checkbox for admins', () => {
    mountSheet({ open: true, isAdmin: true })
    expect(body.text()).toContain('Add as app-wide exercise')
  })

  it('blocks submit with an empty name', async () => {
    mountSheet({ open: true })
    const saveButton = body.findAll('button').find((b) => b.text() === 'Add exercise')!
    await saveButton.trigger('click')

    expect(insertMock).not.toHaveBeenCalled()
    expect(body.text()).toContain('Enter a name.')
  })

  it('creates a personal custom exercise for a non-admin', async () => {
    selectMock.mockReturnValue({ single: singleMock })
    singleMock.mockResolvedValue({
      data: { id: 'e-new', name: 'Nordic Curl', muscle_group: 'hamstrings', equipment: 'other' },
      error: null,
    })
    const wrapper = mountSheet({ open: true, isAdmin: false })

    await body.find('input[type="text"]').setValue('Nordic Curl')
    const saveButton = body.findAll('button').find((b) => b.text() === 'Add exercise')!
    await saveButton.trigger('click')
    await flushPromises()

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nordic Curl',
        created_by: 'user-1',
        is_custom: true,
      }),
    )
    expect(wrapper.emitted('created')).toBeTruthy()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('creates an app-wide exercise when an admin checks the box', async () => {
    selectMock.mockReturnValue({ single: singleMock })
    singleMock.mockResolvedValue({
      data: { id: 'e-new', name: 'Nordic Curl', muscle_group: 'hamstrings', equipment: 'other' },
      error: null,
    })
    mountSheet({ open: true, isAdmin: true })

    await body.find('input[type="text"]').setValue('Nordic Curl')
    await body.find('input[type="checkbox"]').setValue(true)
    const saveButton = body.findAll('button').find((b) => b.text() === 'Add exercise')!
    await saveButton.trigger('click')
    await flushPromises()

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nordic Curl',
        created_by: null,
        is_custom: false,
      }),
    )
  })
})
