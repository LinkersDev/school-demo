import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

export default function AcademicsIndexRedirect() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const teacher = (user?.role ?? '').toLowerCase() === 'teacher'
  if (teacher) {
    return <Navigate to={`/academics/teacher-upload${suffix}`} replace />
  }
  return <Navigate to={`/academics/dashboard${suffix}`} replace />
}
