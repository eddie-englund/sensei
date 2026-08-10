import { describe, it, expect, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
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

afterEach(() => {
  insertMock.mockReset()
  selectMock.mockReset()
  singleMock.mockReset()
})

function mockSelectChain() {
  selectMock.mockReturnValue({ single: singleMock })
}

describe('exercises store createExercise', () => {
  it('inserts the row and pushes the result into exercises on success', async () => {
    mockSelectChain()
    singleMock.mockResolvedValue({
      data: { id: 'e-new', name: 'Nordic Curl', muscle_group: 'hamstrings', equipment: 'other' },
      error: null,
    })
    setActivePinia(createPinia())
    const store = useExercisesStore()

    const result = await store.createExercise({
      name: 'Nordic Curl',
      muscleGroup: 'hamstrings',
      equipment: 'other',
      createdBy: 'user-1',
      isCustom: true,
    })

    expect(insertMock).toHaveBeenCalledWith({
      name: 'Nordic Curl',
      muscle_group: 'hamstrings',
      equipment: 'other',
      created_by: 'user-1',
      is_custom: true,
    })
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      id: 'e-new',
      name: 'Nordic Curl',
      muscle_group: 'hamstrings',
      equipment: 'other',
    })
    expect(store.exercises).toEqual([result.data])
  })

  it('returns the error and leaves exercises unchanged on failure', async () => {
    mockSelectChain()
    const error = new Error('insert failed')
    singleMock.mockResolvedValue({ data: null, error })
    setActivePinia(createPinia())
    const store = useExercisesStore()

    const result = await store.createExercise({
      name: 'Nordic Curl',
      muscleGroup: 'hamstrings',
      equipment: 'other',
      createdBy: 'user-1',
      isCustom: true,
    })

    expect(result).toEqual({ data: null, error })
    expect(store.exercises).toEqual([])
  })
})
