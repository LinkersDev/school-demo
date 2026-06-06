import { useAuth } from './useAuth'

/**
 * Convenience hook that exposes role/scope helpers used throughout the UI.
 *
 * Role checks are based on `user.role` (string set by the backend).
 * Scope checks delegate to the Zustand store's `hasScope` (which reads the
 * JWT-decoded scopes list set at login).
 *
 * Usage:
 *   const { isTeacher, can, canAny } = usePermission()
 *   if (!can('attendance.manage')) return null
 */
export function usePermission() {
  const { user, hasScope } = useAuth()

  const role = user?.role ?? null

  const isAdmin         = role === 'admin'
  const isCoordinator   = role === 'coordinator'
  const isTeacher       = role === 'teacher'
  const isParent        = role === 'parent'
  const isAdminOrCoord  = isAdmin || isCoordinator

  /** True if the user has this exact scope. */
  const can = (scope: string): boolean => hasScope(scope)

  /** True if the user has at least one of the provided scopes. */
  const canAny = (...scopes: string[]): boolean => scopes.some(s => hasScope(s))

  /** True if the user has all of the provided scopes. */
  const canAll = (...scopes: string[]): boolean => scopes.every(s => hasScope(s))

  /** True if the user's role matches any of the provided roles. */
  const hasRole = (...roles: string[]): boolean => roles.includes(role ?? '')

  return {
    user,
    role,
    isAdmin,
    isCoordinator,
    isTeacher,
    isParent,
    isAdminOrCoord,
    can,
    canAny,
    canAll,
    hasRole,
  }
}
