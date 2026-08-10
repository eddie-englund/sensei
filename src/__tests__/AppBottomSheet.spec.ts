import { describe, it, expect, afterEach } from 'vitest'
import { mount, DOMWrapper, type VueWrapper } from '@vue/test-utils'
import AppBottomSheet from '../components/AppBottomSheet.vue'

const body = new DOMWrapper(document.body)
let activeWrapper: VueWrapper | null = null

function mountSheet(props: { open: boolean }, slots?: Record<string, string>) {
  const wrapper = mount(AppBottomSheet, { props, slots })
  activeWrapper = wrapper
  return wrapper
}

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = null
  document.body.innerHTML = ''
})

describe('AppBottomSheet', () => {
  it('renders nothing when closed', () => {
    mountSheet({ open: false })
    expect(body.find('section').exists()).toBe(false)
  })

  it('renders slot content when open', () => {
    mountSheet({ open: true }, { default: '<p>Sheet content</p>' })
    expect(body.text()).toContain('Sheet content')
  })

  it('closes on backdrop click', async () => {
    const wrapper = mountSheet({ open: true })
    await body.find('.fixed.inset-0').trigger('click')
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('does not close when clicking inside the panel', async () => {
    const wrapper = mountSheet({ open: true }, { default: '<p>Sheet content</p>' })
    await body.find('section').trigger('click')
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('closes on Escape', async () => {
    const wrapper = mountSheet({ open: true })
    await body.find('section').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})
