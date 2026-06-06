import { useAuthStore } from '../store/authStore'
import { hasRememberedEmailPreference } from '../lib/tabSession'
import { storePasswordCredential } from '../lib/rememberCredentials'
import api from '../services/api'
import { isDemoMode } from '../demo/env'
import { DEMO_PASSWORD, DEMO_USERS } from '../demo/data'

export function useAuth() {
  const {
    user,
    sessions,
    activeIndex,
    setAuth,
    logout,
    logoutAll,
    switchSession,
    hasScope,
  } = useAuthStore()

  const login = async (email: string, password: string, remember = false) => {
    if (isDemoMode) {
      const user = DEMO_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!user || password !== DEMO_PASSWORD) {
        throw new Error('Invalid demo credentials')
      }
      setAuth(user, `demo-access-${user.id}`, `demo-refresh-${user.id}`, remember)
      return user
    }

    const { data } = await api.post('/auth/login/', { email, password })
    setAuth(data.user, data.access, data.refresh, remember)
    if (remember) {
      const name = data.user.full_name ?? data.user.email ?? email
      await storePasswordCredential(email.trim(), password, name)
    }
    return data.user
  }

  return {
    user,
    sessions,
    activeIndex,
    login,
    logout,
    logoutAll,
    switchSession,
    hasScope,
    isAuthenticated: !!user,
    hasRememberedEmail: hasRememberedEmailPreference(),
  }
}
