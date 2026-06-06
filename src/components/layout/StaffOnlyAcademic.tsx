import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const PARENT_REDIRECTS: Record<string, string> = {
  '/attendance': '/parent/attendance',
  '/homework': '/parent/homework',
  '/grades': '/parent/grades',
  '/academics': '/parent/grades',
}

/**
 * Staff (non-parent) users see the normal academic module pages.
 * Parents are redirected to the parent portal routes that scope data to their children.
 */
export default function StaffOnlyAcademic({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { pathname } = useLocation()

  if (user?.role === 'parent') {
    const to = PARENT_REDIRECTS[pathname] ?? '/dashboard/parent'
    return <Navigate to={to} replace />
  }

  return <>{children}</>
}
