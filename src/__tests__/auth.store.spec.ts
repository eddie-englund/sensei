import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../stores/auth'

type AuthStateCallback = (event: string, session: unknown) => void

const { getSession, onAuthStateChange, profilesSelect } = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<{ data: { session: unknown } }>>(),
  onAuthStateChange: vi.fn<(callback: AuthStateCallback) => void>(),
  profilesSelect: vi.fn<(id: string) => Promise<{ data: { is_admin: boolean } | null }>>(),
}))

vi.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange,
    },
    from: (table: string) => {
      if (table !== 'profiles') throw new Error(`unexpected table ${table}`)
      return {
        select: () => ({
          eq: (_column: string, id: string) => ({
            maybeSingle: () => profilesSelect(id),
          }),
        }),
      }
    },
  },
}))

afterEach(() => {
  getSession.mockReset()
  onAuthStateChange.mockReset()
  profilesSelect.mockReset()
})

describe('auth store isAdmin', () => {
  it('stays false and skips the profiles query when there is no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    setActivePinia(createPinia())
    const auth = useAuthStore()

    await auth.init()

    expect(auth.isAdmin).toBe(false)
    expect(profilesSelect).not.toHaveBeenCalled()
  })

  it('populates isAdmin from the profiles row before init() resolves', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } })
    profilesSelect.mockResolvedValue({ data: { is_admin: true } })
    setActivePinia(createPinia())
    const auth = useAuthStore()

    await auth.init()

    expect(profilesSelect).toHaveBeenCalledWith('user-1')
    expect(auth.isAdmin).toBe(true)
  })

  it('re-fetches isAdmin when the auth state changes to a new session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    setActivePinia(createPinia())
    const auth = useAuthStore()
    await auth.init()
    expect(auth.isAdmin).toBe(false)

    profilesSelect.mockResolvedValue({ data: { is_admin: true } })
    const [[callback]] = onAuthStateChange.mock.calls as [[AuthStateCallback]]
    callback('SIGNED_IN', { user: { id: 'user-2' } })
    await flushPromises()

    expect(profilesSelect).toHaveBeenCalledWith('user-2')
    expect(auth.isAdmin).toBe(true)
  })
})
