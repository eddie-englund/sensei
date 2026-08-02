import { describe, it, expect, afterEach } from 'vitest'

import { mount, DOMWrapper } from '@vue/test-utils'
import AppConfirmDialog from '../components/AppConfirmDialog.vue'

const body = new DOMWrapper(document.body)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AppConfirmDialog', () => {
  it('renders nothing when closed', () => {
    mount(AppConfirmDialog, {
      props: { open: false, title: 'Title', message: 'Message' },
    })
    expect(body.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('renders title and message when open', () => {
    mount(AppConfirmDialog, {
      props: { open: true, title: 'Replace your current mesocycle?', message: 'This will end it.' },
    })
    expect(body.text()).toContain('Replace your current mesocycle?')
    expect(body.text()).toContain('This will end it.')
  })

  it('emits confirm and cancel', async () => {
    const wrapper = mount(AppConfirmDialog, {
      props: { open: true, title: 'Title', message: 'Message' },
    })
    const buttons = body.findAll('button')
    await buttons.find((b) => b.text() === 'Cancel')!.trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()

    await buttons.find((b) => b.text() === 'Continue')!.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })
})
