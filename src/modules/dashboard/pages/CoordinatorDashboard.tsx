import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, ClipboardList, AlertTriangle, FileText,
  Bell, BarChart2, Activity, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import { formatDate, formatDateTime } from '../../../utils/format'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { Textarea } from '../../../components/ui/Input'
import { useAuth } from '../../../hooks/useAuth'

interface DashboardPayload {
  total_students: number
  attendance_today: { total: number; present: number; absent: number; rate: number }
  pending_lesson_plans: number
  pending_plans: PendingPlanRow[]
  at_risk_count: number
  at_risk_breakdown: { absence: number; low_grades: number; no_grades: number }
  at_risk_students: AtRiskRow[]
  recent_activity: ActivityRow[]
}

interface PendingPlanRow {
  id: number
  title: string
  status: string
  teacher_name: string
  subject_name: string
  class_name: string
  week_start: string | null
}

interface AtRiskRow {
  id: number
  name: string
  student_id: string
  class: string | null
  grade_level: string | null
  risk_reasons: string[]
}

interface ActivityRow {
  id: number
  actor: string
  action: string
  description: string
  created_at: string
}

function attendanceColors(rate: number) {
  if (rate > 90) return { text: 'text-emerald-600', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'High' }
  if (rate >= 75) return { text: 'text-amber-600', bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', label: 'Medium' }
  return { text: 'text-red-600', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'Low' }
}

function activityMeta(action: string, description: string) {
  const c = (action + description).toLowerCase()
  if (c.includes('lesson') || c.includes('plan')) return { icon: FileText, bg: 'bg-purple-100', color: 'text-purple-600' }
  if (c.includes('attendance')) return { icon: ClipboardList, bg: 'bg-amber-100', color: 'text-amber-600' }
  if (c.includes('grade') || c.includes('exam')) return { icon: BarChart2, bg: 'bg-indigo-100', color: 'text-indigo-600' }
  if (c.includes('student')) return { icon: GraduationCap, bg: 'bg-blue-100', color: 'text-blue-600' }
  return { icon: Activity, bg: 'bg-gray-100', color: 'text-gray-500' }
}

export default function CoordinatorDashboard() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const role = user?.role ?? ''

  const [rejectTarget, setRejectTarget] = useState<PendingPlanRow | null>(null)
  const [rejectComment, setRejectComment] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-coordinator'],
    queryFn: () => api.get<DashboardPayload>('/dashboard/coordinator/').then((r) => r.data),
  })

  const approve = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/lesson-plans/${id}/approve/`, { action: 'approved', comment }),
    onSuccess: () => {
      toast.success('Lesson plan approved')
      qc.invalidateQueries({ queryKey: ['dashboard-coordinator'] })
      qc.invalidateQueries({ queryKey: ['lesson-plans'] })
    },
    onError: () => toast.error('Approval failed'),
  })

  const reject = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/lesson-plans/${id}/reject/`, { action: 'rejected', comment }),
    onSuccess: () => {
      toast.success('Lesson plan rejected')
      setRejectTarget(null)
      setRejectComment('')
      qc.invalidateQueries({ queryKey: ['dashboard-coordinator'] })
      qc.invalidateQueries({ queryKey: ['lesson-plans'] })
    },
    onError: () => toast.error('Rejection failed'),
  })

  const canApprovePlan = (p: PendingPlanRow) =>
    (role === 'coordinator' && p.status === 'submitted') ||
    (role === 'admin' && (p.status === 'submitted' || p.status === 'coordinator_approved'))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  const att = data?.attendance_today
  const attRate = att?.rate ?? 0
  const attC = attendanceColors(attRate)
  const pending = data?.pending_plans ?? []

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => navigate('/students')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <GraduationCap className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total students</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data?.total_students ?? 0}</p>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            View roster <ArrowRight className="w-3 h-3" />
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/attendance')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Attendance today</p>
          <p className={`text-3xl font-bold mt-1 ${attC.text}`}>{attRate}%</p>
          <p className="text-xs text-gray-500 mt-2">
            {att?.present ?? 0} present · {att?.absent ?? 0} absent
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/students/at-risk')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">At-risk students</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data?.at_risk_count ?? 0}</p>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            Review list <ArrowRight className="w-3 h-3" />
          </p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/lesson-plans')}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending lesson plans</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data?.pending_lesson_plans ?? 0}</p>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            Needs your review <ArrowRight className="w-3 h-3" />
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Attendance overview</h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${attC.badge}`}>{attC.label}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className={`h-full rounded-full transition-all ${attC.bar}`} style={{ width: `${attRate}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">Recorded</p>
              <p className="text-lg font-bold text-gray-900">{att?.total ?? 0}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <p className="text-xs text-gray-500">Present</p>
              <p className="text-lg font-bold text-emerald-700">{att?.present ?? 0}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <p className="text-xs text-gray-500">Absent</p>
              <p className="text-lg font-bold text-red-700">{att?.absent ?? 0}</p>
            </div>
          </div>
          <Button variant="secondary" className="w-full mt-4" onClick={() => navigate('/attendance')}>
            Open attendance
          </Button>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">At-risk students</h2>
            <button type="button" className="text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={() => navigate('/students/at-risk')}>
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {(data?.at_risk_students ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No at-risk students in current criteria.</p>
            ) : (
              (data?.at_risk_students ?? []).map((s) => (
                <div key={s.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500">
                      {s.student_id}
                      {s.class ? ` · ${s.class}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.risk_reasons.map((r) => (
                        <span key={r} className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {r.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/students/${s.id}`)}>
                    Open
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Pending lesson plans</h2>
          <Button variant="secondary" size="sm" onClick={() => navigate('/lesson-plans')}>
            Full list
          </Button>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No plans awaiting review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase border-b border-gray-100">
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Teacher</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-900">{p.title}</div>
                      <div className="text-xs text-gray-500">
                        {[p.subject_name, p.class_name].filter(Boolean).join(' · ')}
                        {p.week_start ? ` · ${formatDate(p.week_start)}` : ''}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{p.teacher_name || '—'}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {canApprovePlan(p) && (
                          <Button
                            size="sm"
                            loading={approve.isPending}
                            onClick={() => approve.mutate({ id: p.id, comment: '' })}
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setRejectTarget(p)
                            setRejectComment('')
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Recent activity</h2>
        <div className="space-y-2">
          {(data?.recent_activity ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity.</p>
          ) : (
            (data?.recent_activity ?? []).map((a) => {
              const meta = activityMeta(a.action, a.description)
              const Icon = meta.icon
              return (
                <div key={a.id} className="flex gap-3 p-3 rounded-xl bg-gray-50">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">{a.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.actor} · {formatDateTime(a.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={rejectTarget ? `Reject: ${rejectTarget.title}` : 'Reject'}>
        <div className="space-y-4">
          <Textarea
            label="Comment (optional)"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={reject.isPending}
              onClick={() => rejectTarget && reject.mutate({ id: rejectTarget.id, comment: rejectComment })}
            >
              Confirm reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
