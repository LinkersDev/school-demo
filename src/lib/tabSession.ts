/**
 * tabSession.ts
 *
 * Auth tokens and user live only in sessionStorage (per-tab). Closing the tab
 * clears the session. localStorage is never used to restore JWTs into a new tab.
 *
 * "Remember me" persists only the last login email (for form prefill), never
 * tokens or passwords. Optional browser PasswordCredential storage is handled
 * in rememberCredentials.ts.
 */

const TAB_AUTH_KEY = 'tab_auth'

/** Legacy key — may have held full JWT blobs; stripped on load. */
const LEGACY_REMEMBER_KEY = 'auth_remembered'

/** Email saved when the user last checked "Remember me" on successful login. */
const LAST_LOGIN_EMAIL_KEY = 'auth_last_login_email'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: number
  email: string
  full_name: string
  role: string | null
  scopes: string[]
}

export interface StoredSession {
  user: SessionUser
  access_token: string
  refresh_token: string
}

export interface TabAuthState {
  sessions: StoredSession[]
  activeIndex: number
}

// ── Internal read / write ──────────────────────────────────────────────────────

function read(): TabAuthState {
  try {
    const raw = sessionStorage.getItem(TAB_AUTH_KEY)
    if (!raw) return { sessions: [], activeIndex: 0 }
    const parsed = JSON.parse(raw) as TabAuthState
    if (!Array.isArray(parsed.sessions)) return { sessions: [], activeIndex: 0 }
    const activeIndex = Math.max(
      0,
      Math.min(parsed.activeIndex ?? 0, parsed.sessions.length - 1),
    )
    return { sessions: parsed.sessions, activeIndex }
  } catch {
    return { sessions: [], activeIndex: 0 }
  }
}

function write(state: TabAuthState): void {
  try {
    sessionStorage.setItem(TAB_AUTH_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded or private browsing — silently ignore
  }
}

/** Remove old localStorage session blobs that could auto-login other tabs. */
function stripLegacyRememberedTokens(): void {
  try {
    const raw = localStorage.getItem(LEGACY_REMEMBER_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { access_token?: string; user?: unknown }
      if (parsed && typeof parsed === 'object' && 'access_token' in parsed) {
        localStorage.removeItem(LEGACY_REMEMBER_KEY)
      }
    } catch {
      localStorage.removeItem(LEGACY_REMEMBER_KEY)
    }
  } catch {
    /* ignore */
  }
}

// ── Remember email only (no tokens) ───────────────────────────────────────────

export function saveLastLoginEmail(email: string): void {
  try {
    const e = email.trim()
    if (e) localStorage.setItem(LAST_LOGIN_EMAIL_KEY, e)
  } catch {
    /* ignore */
  }
}

export function getLastLoginEmail(): string | null {
  try {
    const e = localStorage.getItem(LAST_LOGIN_EMAIL_KEY)?.trim()
    return e || null
  } catch {
    return null
  }
}

export function clearLastLoginEmail(): void {
  try {
    localStorage.removeItem(LAST_LOGIN_EMAIL_KEY)
  } catch {
    /* ignore */
  }
}

/** True if an email was persisted via "Remember me" on last successful login. */
export function hasRememberedEmailPreference(): boolean {
  return !!getLastLoginEmail()
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Full state from sessionStorage only — never hydrates JWTs from localStorage.
 */
export function loadAuthState(): TabAuthState {
  stripLegacyRememberedTokens()
  return read()
}

export function getActiveSession(): StoredSession | null {
  const state = read()
  return state.sessions[state.activeIndex] ?? null
}

export function getToken(): string | null {
  return getActiveSession()?.access_token ?? null
}

export function getRefreshToken(): string | null {
  return getActiveSession()?.refresh_token ?? null
}

export function updateAccessToken(newAccess: string, newRefresh?: string): void {
  const state = read()
  const active = state.sessions[state.activeIndex]
  if (active) {
    active.access_token = newAccess
    if (newRefresh) active.refresh_token = newRefresh
    write(state)
  }
}

export function addOrUpdateSession(session: StoredSession, remember = false): TabAuthState {
  const state = read()
  const existingIdx = state.sessions.findIndex(s => s.user.email === session.user.email)
  if (existingIdx >= 0) {
    state.sessions[existingIdx] = session
    state.activeIndex = existingIdx
  } else {
    state.sessions.push(session)
    state.activeIndex = state.sessions.length - 1
  }
  write(state)
  if (remember) {
    saveLastLoginEmail(session.user.email)
  } else {
    clearLastLoginEmail()
  }
  return state
}

export function removeActiveSession(): TabAuthState {
  const state = read()
  if (state.sessions.length === 0) return state

  const leaving = state.sessions[state.activeIndex]
  const rememberedEmail = getLastLoginEmail()
  if (rememberedEmail && leaving?.user.email === rememberedEmail) {
    clearLastLoginEmail()
  }

  state.sessions.splice(state.activeIndex, 1)
  state.activeIndex = Math.max(0, Math.min(state.activeIndex, state.sessions.length - 1))
  write(state)
  return state
}

export function clearAllSessions(): void {
  sessionStorage.removeItem(TAB_AUTH_KEY)
  clearLastLoginEmail()
}

export function switchToSession(index: number): TabAuthState {
  const state = read()
  if (index >= 0 && index < state.sessions.length) {
    state.activeIndex = index
    write(state)
  }
  return state
}
