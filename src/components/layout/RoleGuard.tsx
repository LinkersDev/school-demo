import { ShieldOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface RoleGuardProps {
  /** Require ANY ONE of these scopes to pass. */
  scopes?: string[]
  /** Require ANY ONE of these exact role names to pass. */
  roles?: string[]
  children: React.ReactNode
}

function AccessDenied() {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-sm px-4">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldOff className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-1">
            You don't have permission to view this page. Contact your administrator if you believe this is a mistake.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          ← Go back
        </button>
      </div>
    </div>
  )
}

/**
 * Wrap a route element with this component to enforce role / scope access.
 *
 * - If `scopes` is provided, the user must have at least one of those scopes.
 * - If `roles` is provided, the user's role must be one of them.
 * - Both conditions are AND-ed together if both are supplied.
 * - Renders an inline "Access Denied" UI instead of redirecting so the user
 *   sees a clear explanation rather than a silent redirect loop.
 */
export default function RoleGuard({ scopes, roles, children }: RoleGuardProps) {
  const { user, hasScope } = useAuth()

  if (!user) return null

  if (roles && !roles.includes(user.role ?? '')) {
    return <AccessDenied />
  }

  if (scopes && !scopes.some(s => hasScope(s))) {
    return <AccessDenied />
  }

  return <>{children}</>
}
