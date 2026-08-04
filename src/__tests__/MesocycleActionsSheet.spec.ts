import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, DOMWrapper, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import MesocycleActionsSheet from '../components/MesocycleActionsSheet.vue'
import { useWorkoutsStore } from '../stores/workouts'

const body = new DOMWrapper(document.body)

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountSheet(props: { open: boolean; showEditLength?: boolean } = { open: true }) {
  const pinia = createPinia()
  const workouts = useWorkoutsStore(pinia)
  workouts.activeMesocycle = { id: 'meso-1', name: 'Block', clonedFromId: null }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: '/', component: { template: '<div />' } },
      { path: '/workouts/list', name: '/workouts/list', component: { template: '<div />' } },
    ],
  })
  router.push('/workouts/list')
  await router.isReady()

  const endSpy = vi.spyOn(workouts, 'endMesocycle').mockResolvedValue({ error: null })
  const pushSpy = vi.spyOn(router, 'push')

  const wrapper = mount(MesocycleActionsSheet, {
    props,
    global: { plugins: [pinia, router] },
  })
  await flushPromises()

  return { wrapper, workouts, endSpy, pushSpy }
}

describe('MesocycleActionsSheet', () => {
  it('renders nothing when closed', async () => {
    await mountSheet({ open: false })
    expect(body.text()).not.toContain('Mesocycle options')
  })

  it('hides "Edit mesocycle length" by default and shows it with showEditLength', async () => {
    await mountSheet({ open: true })
    expect(body.text()).not.toContain('Edit mesocycle length')

    document.body.innerHTML = ''
    await mountSheet({ open: true, showEditLength: true })
    expect(body.text()).toContain('Edit mesocycle length')
  })

  it('clicking "Edit mesocycle length" closes the sheet and emits edit-length', async () => {
    const { wrapper } = await mountSheet({ open: true, showEditLength: true })
    const editButton = body.findAll('button').find((b) => b.text() === 'Edit mesocycle length')!
    await editButton.trigger('click')

    expect(wrapper.emitted('edit-length')).toBeTruthy()
    const openEvents = wrapper.emitted('update:open')!
    expect(openEvents[openEvents.length - 1]).toEqual([false])
  })

  it('clicking "End mesocycle" shows only the first confirm dialog', async () => {
    const { endSpy } = await mountSheet()
    const endButton = body.findAll('button').find((b) => b.text() === 'End mesocycle')!
    await endButton.trigger('click')

    expect(body.text()).toContain('End mesocycle early?')
    expect(body.text()).not.toContain('Are you sure?')
    expect(endSpy).not.toHaveBeenCalled()
  })

  it('confirming the first dialog shows the second, without calling the store yet', async () => {
    const { endSpy } = await mountSheet()
    const endButton = body.findAll('button').find((b) => b.text() === 'End mesocycle')!
    await endButton.trigger('click')

    // the confirm dialog's own confirm button also reads "End mesocycle" (confirm-label)
    const dialogs = body.findAll('[role="alertdialog"]')
    expect(dialogs).toHaveLength(1)

    const confirmButton = dialogs[0]!.findAll('button').find((b) => b.text() === 'End mesocycle')!
    await confirmButton.trigger('click')

    expect(body.text()).toContain('Are you sure?')
    expect(endSpy).not.toHaveBeenCalled()
  })

  it('confirming the second dialog calls endMesocycle and redirects home on success', async () => {
    const { wrapper, endSpy, pushSpy } = await mountSheet()
    await body
      .findAll('button')
      .find((b) => b.text() === 'End mesocycle')!
      .trigger('click')

    const firstDialog = body.findAll('[role="alertdialog"]')[0]!
    await firstDialog
      .findAll('button')
      .find((b) => b.text() === 'End mesocycle')!
      .trigger('click')
    await flushPromises()

    const secondDialog = body.findAll('[role="alertdialog"]')[0]!
    await secondDialog
      .findAll('button')
      .find((b) => b.text() === 'Yes, end it')!
      .trigger('click')
    await flushPromises()

    expect(endSpy).toHaveBeenCalledTimes(1)
    expect(pushSpy).toHaveBeenCalledWith({ name: '/' })
    const openEvents = wrapper.emitted('update:open')!
    expect(openEvents[openEvents.length - 1]).toEqual([false])
  })

  it('shows an inline error and leaves the sheet open when ending fails', async () => {
    const { workouts, pushSpy } = await mountSheet()
    vi.spyOn(workouts, 'endMesocycle').mockResolvedValue({ error: new Error('boom') })

    await body
      .findAll('button')
      .find((b) => b.text() === 'End mesocycle')!
      .trigger('click')
    const firstDialog = body.findAll('[role="alertdialog"]')[0]!
    await firstDialog
      .findAll('button')
      .find((b) => b.text() === 'End mesocycle')!
      .trigger('click')
    await flushPromises()

    const secondDialog = body.findAll('[role="alertdialog"]')[0]!
    await secondDialog
      .findAll('button')
      .find((b) => b.text() === 'Yes, end it')!
      .trigger('click')
    await flushPromises()

    expect(body.find('[role="alert"]').text()).toBe('boom')
    expect(body.find('[role="alertdialog"]').exists()).toBe(false)
    expect(body.text()).toContain('Mesocycle options')
    expect(pushSpy).not.toHaveBeenCalledWith({ name: '/' })
  })

  it('cancelling either dialog calls neither the store nor the router', async () => {
    const { endSpy, pushSpy } = await mountSheet()
    await body
      .findAll('button')
      .find((b) => b.text() === 'End mesocycle')!
      .trigger('click')

    let dialog = body.findAll('[role="alertdialog"]')[0]!
    await dialog
      .findAll('button')
      .find((b) => b.text() === 'Cancel')!
      .trigger('click')
    expect(body.find('[role="alertdialog"]').exists()).toBe(false)

    await body
      .findAll('button')
      .find((b) => b.text() === 'End mesocycle')!
      .trigger('click')
    dialog = body.findAll('[role="alertdialog"]')[0]!
    await dialog
      .findAll('button')
      .find((b) => b.text() === 'End mesocycle')!
      .trigger('click')

    dialog = body.findAll('[role="alertdialog"]')[0]!
    await dialog
      .findAll('button')
      .find((b) => b.text() === 'Cancel')!
      .trigger('click')
    expect(body.find('[role="alertdialog"]').exists()).toBe(false)

    expect(endSpy).not.toHaveBeenCalled()
    expect(pushSpy).not.toHaveBeenCalled()
  })
})
