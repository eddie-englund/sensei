import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import AppConfirmDialog from '../components/AppConfirmDialog.vue'

describe('AppConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(AppConfirmDialog, {
      props: { open: false, title: 'Title', message: 'Message' },
    })
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('renders title and message when open', () => {
    const wrapper = mount(AppConfirmDialog, {
      props: { open: true, title: 'Replace your current mesocycle?', message: 'This will end it.' },
    })
    expect(wrapper.text()).toContain('Replace your current mesocycle?')
    expect(wrapper.text()).toContain('This will end it.')
  })

  it('emits confirm and cancel', async () => {
    const wrapper = mount(AppConfirmDialog, {
      props: { open: true, title: 'Title', message: 'Message' },
    })
    const buttons = wrapper.findAll('button')
    await buttons.find((b) => b.text() === 'Cancel')!.trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()

    await buttons.find((b) => b.text() === 'Continue')!.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })
})
