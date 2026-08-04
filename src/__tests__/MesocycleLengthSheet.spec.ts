import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, DOMWrapper, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import MesocycleLengthSheet from '../components/MesocycleLengthSheet.vue'
import { useWorkoutsStore } from '../stores/workouts'

const body = new DOMWrapper(document.body)

afterEach(() => {
  document.body.innerHTML = ''
})

function structureFor(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `week-${i + 1}`,
    week_number: i + 1,
    is_deload: i + 1 === count,
    mesocycle_workouts: [],
  }))
}

async function mountSheet(weekCount: number) {
  const pinia = createPinia()
  const workouts = useWorkoutsStore(pinia)
  workouts.activeMesocycle = { id: 'meso-1', name: 'Block', clonedFromId: null }
  workouts.structure = structureFor(weekCount)
  const updateSpy = vi.spyOn(workouts, 'updateMesocycleLength').mockResolvedValue({ error: null })

  const wrapper = mount(MesocycleLengthSheet, {
    props: { open: true },
    global: { plugins: [pinia] },
  })
  await flushPromises()

  return { wrapper, workouts, updateSpy }
}

describe('MesocycleLengthSheet', () => {
  it('renders nothing when closed', () => {
    const pinia = createPinia()
    useWorkoutsStore(pinia)
    mount(MesocycleLengthSheet, { props: { open: false }, global: { plugins: [pinia] } })
    expect(body.text()).not.toContain('Mesocycle length')
  })

  it('seeds the stepper from the current week count and disables save when unchanged', async () => {
    await mountSheet(4)
    expect(body.text()).toContain('4')
    const saveButton = body.findAll('button').find((b) => b.text() === 'Save')!
    expect(saveButton.attributes('disabled')).toBeDefined()
  })

  it('the − button floors at 1 week', async () => {
    await mountSheet(1)
    const minusButton = body.find('[aria-label="Fewer weeks"]')
    expect(minusButton.attributes('disabled')).toBeDefined()
  })

  it('lengthening saves directly without a confirm dialog', async () => {
    const { updateSpy } = await mountSheet(3)
    const plusButton = body.find('[aria-label="More weeks"]')
    await plusButton.trigger('click')
    expect(body.text()).toContain('4')

    const saveButton = body.findAll('button').find((b) => b.text() === 'Save')!
    await saveButton.trigger('click')
    await flushPromises()

    expect(body.find('[role="alertdialog"]').exists()).toBe(false)
    expect(updateSpy).toHaveBeenCalledWith(4)
  })

  it('shortening requires confirming a destructive dialog naming the removed weeks', async () => {
    const { updateSpy } = await mountSheet(4)
    const minusButton = body.find('[aria-label="Fewer weeks"]')
    await minusButton.trigger('click')
    await minusButton.trigger('click')
    expect(body.text()).toContain('2')

    const saveButton = body.findAll('button').find((b) => b.text() === 'Save')!
    await saveButton.trigger('click')
    await flushPromises()

    expect(body.find('[role="alertdialog"]').exists()).toBe(true)
    expect(body.text()).toContain('weeks 3–4')
    expect(updateSpy).not.toHaveBeenCalled()

    const confirmButton = body.findAll('button').find((b) => b.text() === 'Delete weeks')!
    await confirmButton.trigger('click')
    await flushPromises()

    expect(updateSpy).toHaveBeenCalledWith(2)
  })
})
