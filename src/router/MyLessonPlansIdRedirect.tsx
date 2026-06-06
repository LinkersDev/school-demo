import { Navigate, useParams } from 'react-router-dom'

/** Normalizes /my-lesson-plans/123 → /my-lesson-plans?plan=123 (no splat 404). */
export default function MyLessonPlansIdRedirect() {
  const { planId } = useParams()
  const id = planId?.trim() ?? ''
  if (id && /^\d+$/.test(id)) {
    return <Navigate to={`/my-lesson-plans?plan=${encodeURIComponent(id)}`} replace />
  }
  return <Navigate to="/my-lesson-plans" replace />
}
