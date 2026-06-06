/**
 * authStore.ts
 *
 * Zustand store for auth state.
 * Persistence is handled manually via tabSession (sessionStorage). JWTs never
 * live in localStorage. Each tab has its own session; a new tab starts logged
 * out. "Remember me" only stores the last email for prefill + optional browser
 * PasswordCredential (see rememberCredentials.ts).
 *
 * Multi-account support: multiple sessions can coexist inside one tab.
 * The active session drives the `user`, `access_token` and `refresh_token`
 * fields read by the rest of the app.
 */

import { create } from 'zustand'
import {
  loadAuthState,
  addOrUpdateSession,
  removeActiveSession,
  clearAllSessions,
  switchToSession,
  type StoredSession,
  type SessionUser,
  type TabAuthState,
} from '../lib/tabSession'

// ── Types ──────────────────────────────────────────────────────────────────────

// Re-export so consumers don't need to import from tabSession directly.
export type { SessionUser as AuthUser, StoredSession }

interface AuthState {
  // ── Session list ────────────────────────────────────────────────────────────
  sessions: StoredSession[]
  activeIndex: number

  // ── Convenience fields (derived from the active session) ────────────────────
  user: SessionUser | null
  access_token: string | null
  refresh_token: string | null

  // ── Actions ─────────────────────────────────────────────────────────────────
  /** Login or re-login: adds a session (or replaces same email). */
  setAuth: (user: SessionUser, access: string, refresh: string, remember?: boolean) => void

  /** Logout the currently active session; switches to the next one if any. */
  logout: () => void

  /** Logout ALL sessions in this tab. */
  logoutAll: () => void

  /** Switch the active session by index. */
  switchSession: (index: number) => void

  /**
   * Re-read sessionStorage and sync store state.
   * Called by the Axios interceptor after it silently refreshes a token so
   * the store's in-memory copy stays accurate.
   */
  syncFromStorage: () => void

  hasScope: (scope: string) => boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function deriveFromActive(
  sessions: StoredSession[],
  activeIndex: number
): Pick<AuthState, 'user' | 'access_token' | 'refresh_token'> {
  const active = sessions[activeIndex] ?? null
  return {
    user: active?.user ?? null,
    access_token: active?.access_token ?? null,
    refresh_token: active?.refresh_token ?? null,
  }
}

function stateFromTab(tab: TabAuthState): Pick<
  AuthState,
  'sessions' | 'activeIndex' | 'user' | 'access_token' | 'refresh_token'
> {
  return {
    sessions: tab.sessions,
    activeIndex: tab.activeIndex,
    ...deriveFromActive(tab.sessions, tab.activeIndex),
  }
}

// ── Store ──────────────────────────────────────────────────────────────────────

const initial = loadAuthState()

export const useAuthStore = create<AuthState>()((set, get) => ({
  // ── Initial state from sessionStorage ───────────────────────────────────────
  ...stateFromTab(initial),

  // ── Actions ─────────────────────────────────────────────────────────────────

  setAuth: (user, access, refresh, remember = false) => {
    const next = addOrUpdateSession(
      { user, access_token: access, refresh_token: refresh },
      remember
    )
    set(stateFromTab(next))
  },

  logout: () => {
    const next = removeActiveSession()
    if (next.sessions.length === 0) {
      set({ sessions: [], activeIndex: 0, user: null, access_token: null, refresh_token: null })
    } else {
      set(stateFromTab(next))
    }
  },

  logoutAll: () => {
    clearAllSessions()
    set({ sessions: [], activeIndex: 0, user: null, access_token: null, refresh_token: null })
  },

  switchSession: (index) => {
    const next = switchToSession(index)
    set(stateFromTab(next))
  },

  syncFromStorage: () => {
    set(stateFromTab(loadAuthState()))
  },

  hasScope: (scope) => {
    const { user } = get()
    if (!user) return false
    if (user.scopes.includes(scope)) return true
    if (scope.endsWith('.read')) {
      return user.scopes.includes(scope.replace('.read', '.manage'))
    }
    return false
  },
}))
