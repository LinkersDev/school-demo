import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../../services/api'
import { parentPortalService } from '../services/parentPortal.service'

interface DashboardChild {
  id: number
  name: string
  student_id: string
  class: string | null
  class_id: number | null
}

export function useParentChildContext() {
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard-parent'],
    queryFn: () => api.get('/dashboard/parent/').then(r => r.data),
  })

  const children: DashboardChild[] = dash?.children ?? []

  const qStudent = searchParams.get('student')
  const parsed = qStudent ? Number(qStudent) : NaN

  const activeId = useMemo(() => {
    if (children.length === 0) return undefined
    if (Number.isFinite(parsed) && children.some(c => c.id === parsed)) {
      return parsed
    }
    return children[0].id
  }, [children, parsed])

  useEffect(() => {
    if (activeId == null) return
    const cur = searchParams.get('student')
    if (cur !== String(activeId)) {
      const next = new URLSearchParams(searchParams)
      next.set('student', String(activeId))
      setSearchParams(next, { replace: true })
    }
  }, [activeId, searchParams, setSearchParams])

  const setStudentId = (id: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('student', String(id))
    setSearchParams(next, { replace: true })
  }

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['parent-child-detail', activeId],
    queryFn: () => parentPortalService.getChildDetail(activeId!),
    enabled: activeId != null,
  })

  return {
    children,
    activeId,
    setStudentId,
    detail,
    isLoading: dashLoading || (activeId != null && detailLoading),
    hasChildren: children.length > 0,
  }
}
