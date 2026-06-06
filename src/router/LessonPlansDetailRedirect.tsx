import { Navigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Backend notifications link to /lesson-plans/:id but the SPA only had /lesson-plans.
 * Normalizes to list routes with optional ?plan=id for deep-linking.
 */
export default function LessonPlansDetailRedirect() {
  const { planId } = useParams()
  const role = useAuthStore((s) => s.user?.role)
  const id = planId?.trim() ?? ''
  const suffix = id && /^\d+$/.test(id) ? `?plan=${encodeURIComponent(id)}` : ''

  if (role === 'teacher') {
    return <Navigate to={`/my-lesson-plans${suffix}`} replace />
  }
  return <Navigate to={`/lesson-plans${suffix}`} replace />
}
