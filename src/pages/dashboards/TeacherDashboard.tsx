import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, BookOpen, ClipboardList, Clock3,
  FileText, GraduationCap, LayoutDashboard, MessageSquare, Users,
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import { TeacherWorkspaceShell } from '../../components/teacher/TeacherWorkspaceShell'

function FrostStat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: typeof Users
  accent: 'indigo' | 'teal' | 'violet'
}) {
  const ring =
    accent === 'indigo'
      ? 'ring-indigo-400/30'
      : accent === 'teal'
        ? 'ring-teal-400/30'
        : 'ring-violet-400/30'
  const iconBg =
    accent === 'indigo'
      ? 'bg-indigo-600'
      : accent === 'teal'
        ? 'bg-teal-600'
        : 'bg-violet-600'

  return (
    <div
      className={`rounded-2xl border border-white/50 bg-white/75 p-5 shadow-sm shadow-indigo-900/5 backdrop-blur-sm ring-2 ${ring}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800/80">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-indigo-950">{value}</p>
        </div>
        <div className={`rounded-xl ${iconBg} p-2.5 text-white shadow-md`}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  )
}

export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-teacher'],
    queryFn: () => api.get('/dashboard/teacher/').then((r) => r.data),
  })

  if (isLoading) {
    return (
      <TeacherWorkspaceShell title="Loading…" subtitle="Preparing your workspace">
        <div className="py-16 text-center text-sm text-indigo-700/70">Loading dashboard…</div>
      </TeacherWorkspaceShell>
    )
  }

  const pendingTotal =
    (data?.tasks?.pending_attendance ?? 0) +
    (data?.tasks?.homework_to_review ?? 0) +
    (data?.tasks?.pending_lessons ?? 0)

  return (
    <TeacherWorkspaceShell
      title={`Welcome, ${user?.full_name ?? 'Teacher'}`}
      subtitle="Your classes, students, and daily tasks — scoped to what you’re assigned."
      heroIcon={LayoutDashboard}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FrostStat label="My classes" value={data?.my_classes_count ?? 0} icon={GraduationCap} accent="indigo" />
        <FrostStat label="My students" value={data?.my_students_count ?? 0} icon={Users} accent="teal" />
        <FrostStat label="Pending tasks" value={pendingTotal} icon={ClipboardList} accent="violet" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/75 shadow-sm shadow-indigo-900/5 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-indigo-100/60 px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-indigo-950">
              <GraduationCap className="h-4 w-4 text-indigo-700" />
              Today&apos;s classes
            </h3>
            <Link to="/my-classes" className="text-xs font-medium text-indigo-700 hover:text-indigo-900">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-indigo-100/50">
            {(data?.today_classes ?? []).map((c: { id: number; name: string; grade_level: string; time: string }) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="font-medium text-indigo-950">{c.name}</div>
                  <div className="mt-0.5 text-xs text-indigo-800/65">{c.grade_level}</div>
                </div>
                <div className="flex w-full shrink-0 flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
                  <Badge color="gray">{c.time}</Badge>
                  <button
                    type="button"
                    onClick={() => navigate('/attendance')}
                    className="min-h-[44px] rounded-lg border border-indigo-200/70 bg-white/80 px-3 py-2 text-xs font-medium text-indigo-800 shadow-sm backdrop-blur-sm transition hover:bg-indigo-50/90 sm:py-1.5"
                  >
                    Take attendance
                  </button>
                </div>
              </div>
            ))}
            {(!data?.today_classes || data.today_classes.length === 0) && (
              <div className="px-5 py-10 text-center text-sm text-indigo-700/70">No classes assigned for today.</div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/75 shadow-sm shadow-indigo-900/5 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-indigo-100/60 px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-indigo-950">
              <ClipboardList className="h-4 w-4 text-indigo-700" />
              Tasks
            </h3>
            <Badge color="blue">Today</Badge>
          </div>
          <div className="space-y-3 p-5">
            {[
              {
                label: 'Pending attendance',
                value: data?.tasks?.pending_attendance ?? 0,
                color: 'red' as const,
                action: '/attendance',
              },
              {
                label: 'Homework to review',
                value: data?.tasks?.homework_to_review ?? 0,
                color: 'yellow' as const,
                action: '/homework',
              },
              {
                label: 'Pending lesson plans',
                value: data?.tasks?.pending_lessons ?? 0,
                color: 'purple' as const,
                action: '/my-lesson-plans',
              },
            ].map((task) => (
              <div
                key={task.label}
                className="flex flex-col gap-3 rounded-xl border border-white/40 bg-white/50 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-indigo-950">{task.label}</div>
                  <div className="text-xs text-indigo-800/60">Your assignments only</div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <Badge color={task.color}>{task.value}</Badge>
                  <button
                    type="button"
                    onClick={() => navigate(task.action)}
                    className="min-h-[44px] min-w-[44px] px-2 text-xs font-medium text-indigo-700 hover:text-indigo-950 sm:min-h-0 sm:min-w-0 sm:px-0"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/75 shadow-sm shadow-indigo-900/5 backdrop-blur-sm">
          <div className="border-b border-indigo-100/60 px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-indigo-950">
              <Clock3 className="h-4 w-4 text-indigo-700" />
              Quick actions
            </h3>
          </div>
          <div className="space-y-2 p-5">
            {[
              {
                label: 'Take attendance',
                icon: ClipboardList,
                to: '/attendance',
                tone: 'border-teal-200/60 bg-teal-50/80 text-teal-950 hover:bg-teal-100/90',
              },
              {
                label: 'My homework',
                icon: BookOpen,
                to: '/homework',
                tone: 'border-indigo-200/60 bg-indigo-50/80 text-indigo-950 hover:bg-indigo-100/90',
              },
              {
                label: 'Lesson plans',
                icon: FileText,
                to: '/my-lesson-plans',
                tone: 'border-violet-200/60 bg-violet-50/80 text-violet-950 hover:bg-violet-100/90',
              },
              {
                label: 'Messages',
                icon: MessageSquare,
                to: '/messages',
                tone: 'border-white/60 bg-white/70 text-indigo-950 hover:bg-white/90',
              },
            ].map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className={`flex min-h-[44px] w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium shadow-sm backdrop-blur-sm transition ${action.tone}`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </span>
                  <span className="text-indigo-400">→</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/75 shadow-sm shadow-indigo-900/5 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-indigo-100/60 px-5 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-indigo-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Alerts
            </h3>
            <Badge color={(data?.alerts?.length ?? 0) > 0 ? 'orange' : 'green'}>
              {(data?.alerts?.length ?? 0) > 0 ? 'Needs attention' : 'Clear'}
            </Badge>
          </div>
          <div className="divide-y divide-indigo-100/50">
            {(data?.frequent_absence_students ?? []).map(
              (student: { id: number; name: string; class_name: string; absence_count: number }) => (
                <div key={student.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium text-indigo-950">{student.name}</div>
                    <div className="text-xs text-indigo-800/60">{student.class_name}</div>
                  </div>
                  <Badge color="orange">{student.absence_count} absences</Badge>
                </div>
              ),
            )}
            {(data?.alerts ?? []).map((alert: string) => (
              <div key={alert} className="px-5 py-3 text-sm text-indigo-900/85">
                {alert}
              </div>
            ))}
            {!data?.frequent_absence_students?.length && !data?.alerts?.length && (
              <div className="px-5 py-10 text-center text-sm text-indigo-700/70">No urgent alerts for today.</div>
            )}
          </div>
        </div>
      </div>
    </TeacherWorkspaceShell>
  )
}
