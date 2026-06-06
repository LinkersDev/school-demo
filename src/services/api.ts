/**
 * api.ts
 *
 * Axios instance with tab-isolated auth.
 *
 * Tokens are read from sessionStorage (via tabSession helpers) so each
 * browser tab uses its own credentials — logging in on Tab B never affects
 * the session on Tab A.
 *
 * On a 401 the interceptor silently attempts a token refresh, writes the new
 * access token back to sessionStorage (this tab only), syncs the Zustand store,
 * and retries the original request. If the refresh also fails the user is
 * redirected to /login (only for the current tab). Tokens are never read from
 * localStorage.
 */

import axios from 'axios'
import {
  getToken,
  getRefreshToken,
  updateAccessToken,
  removeActiveSession,
} from '../lib/tabSession'
import { isDemoMode } from '../demo/env'
import { installDemoApi } from '../demo/mockApi'

// Imported lazily inside the interceptor to avoid a top-level circular
// reference (api ← authStore ← tabSession ← api).
const getStore = () =>
  import('../store/authStore').then(m => m.useAuthStore.getState())

// ── Axios instance ─────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

if (isDemoMode) {
  installDemoApi(api)
}

// ── Request interceptor: attach per-tab token ──────────────────────────────────

api.interceptors.request.use(config => {
  const token = getToken() // reads from sessionStorage of THIS tab only
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// ── Response interceptor: silent token refresh ────────────────────────────────

api.interceptors.response.use(
  response => response,
  async error => {
    if (isDemoMode) {
      return Promise.reject(error)
    }

    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      const refresh = getRefreshToken()

      if (refresh) {
        try {
          // Use a plain axios call (not `api`) to avoid interceptor recursion.
          const { data } = await axios.post<{ access: string; refresh?: string }>(
            '/api/auth/refresh/',
            { refresh },
          )

          // Persist new tokens (SimpleJWT may return a rotated refresh token).
          updateAccessToken(data.access, data.refresh)

          // Keep the Zustand store's in-memory copy in sync.
          const store = await getStore()
          store.syncFromStorage()

          // Retry the original request with the fresh token.
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          // Refresh token expired / revoked — clear this tab's session only.
          removeActiveSession()
          const store = await getStore()
          store.syncFromStorage()
          window.location.href = '/login'
        }
      } else {
        // No refresh token in this tab — send to login.
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
