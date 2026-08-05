import { describe, it, expect, afterEach } from 'vitest'
import { mount, DOMWrapper, type VueWrapper } from '@vue/test-utils'
import SetActionsSheet from '../components/SetActionsSheet.vue'
import type { SetMarker } from '../stores/workouts'

const body = new DOMWrapper(document.body)
let activeWrapper: VueWrapper | null = null

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = null
  document.body.innerHTML = ''
})

function mountSheet(props: {
  open: boolean
  setNumber?: number
  isSkipped?: boolean
  isLogged?: boolean
  isTrailingSet?: boolean
  marker?: SetMarker | null
}) {
  const wrapper = mount(SetActionsSheet, {
    props: {
      setNumber: 1,
      isSkipped: false,
      isLogged: false,
      isTrailingSet: false,
      marker: null,
      ...props,
    },
  })
  activeWrapper = wrapper
  return wrapper
}

describe('SetActionsSheet', () => {
  it('renders nothing when closed', () => {
    mountSheet({ open: false })
    expect(body.find('section').exists()).toBe(false)
  })

  it('shows "Skip set" for a pending set, not "Unskip set" or "Remove set"', () => {
    mountSheet({ open: true })

    expect(body.findAll('button').some((b) => b.text() === 'Skip set')).toBe(true)
    expect(body.findAll('button').some((b) => b.text() === 'Unskip set')).toBe(false)
    expect(body.findAll('button').some((b) => b.text() === 'Remove set')).toBe(false)
  })

  it('shows "Unskip set" instead of "Skip set" once skipped', () => {
    mountSheet({ open: true, isSkipped: true })

    expect(body.findAll('button').some((b) => b.text() === 'Unskip set')).toBe(true)
    expect(body.findAll('button').some((b) => b.text() === 'Skip set')).toBe(false)
  })

  it('hides "Skip set" for an already-logged set', () => {
    mountSheet({ open: true, isLogged: true })

    expect(body.findAll('button').some((b) => b.text() === 'Skip set')).toBe(false)
  })

  it('shows "Remove set" only for a trailing, unlogged set', () => {
    mountSheet({ open: true, isTrailingSet: true, isLogged: false })
    expect(body.findAll('button').some((b) => b.text() === 'Remove set')).toBe(true)
  })

  it('hides "Remove set" for a trailing set that is already logged', () => {
    mountSheet({ open: true, isTrailingSet: true, isLogged: true })
    expect(body.findAll('button').some((b) => b.text() === 'Remove set')).toBe(false)
  })

  it('emits skip, unskip, and remove, then closes', async () => {
    const wrapper = mountSheet({ open: true, isTrailingSet: true })
    const skipButton = body.findAll('button').find((b) => b.text() === 'Skip set')!
    await skipButton.trigger('click')

    expect(wrapper.emitted('skip')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('emits set-marker with the picked marker', async () => {
    const wrapper = mountSheet({ open: true })
    const myrepButton = body.findAll('button').find((b) => b.text() === 'Myrep')!
    await myrepButton.trigger('click')

    expect(wrapper.emitted('set-marker')).toEqual([['myrep']])
  })

  it('shows a checkmark on the active marker row, and none for the other', () => {
    mountSheet({ open: true, marker: 'myrep_match' })

    const myrepRow = body.findAll('button').find((b) => b.text() === 'Myrep')!
    const myrepMatchRow = body.findAll('button').find((b) => b.text() === 'Myrep match')!
    expect(myrepRow.find('svg').exists()).toBe(false)
    expect(myrepMatchRow.find('svg').exists()).toBe(true)
  })

  it('closes on Escape without emitting anything', async () => {
    const wrapper = mountSheet({ open: true })
    await body.find('section').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('skip')).toBeUndefined()
    expect(wrapper.emitted('remove')).toBeUndefined()
  })
})
