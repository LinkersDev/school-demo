import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, Users, ClipboardList,
  UserCheck, BookOpen, School, Activity,
  TrendingUp, Plus, ChevronRight, Bell, CheckCircle2,
  Clock, BarChart2, FileText, Zap,
} from 'lucide-react'
import { formatDateTime } from '../../utils/format'
import api from '../../services/api'

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardData {
  total_students: number
  total_teachers: number
  students_inactive?: number
  students_joined_this_month?: number
  teachers_joined_this_month?: number
  attendance_today: { total: number; present: number; absent: number; rate: number }
  at_risk_count: number
  at_risk_breakdown: { absence: number; low_grades: number; no_grades: number }
  pending_lesson_plans: number
  recent_activity: { id: number; actor: string; action: string; description: string; created_at: string }[]
}

interface HomeworkItem {
  id: number
  submission_count: number
}

interface LessonPlanItem {
  id: number
  status: string
}

interface StudentItem {
  id: number
  assigned_class_detail: { grade_level: string } | null
}

interface AttendanceRecord {
  id: number
  date: string
  status: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function attendanceColors(rate: number) {
  if (rate > 90) return { text: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', label: 'High' }
  if (rate >= 75) return { text: 'text-amber-600',  bar: 'bg-amber-400',   bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',   label: 'Medium' }
  return            { text: 'text-red-600',     bar: 'bg-red-500',     bg: 'bg-red-50',     border: 'border-red-200',     badge: 'bg-red-100 text-red-700',     label: 'Low' }
}

function activityMeta(action: string, description: string) {
  const combined = (action + description).toLowerCase()
  if (combined.includes('absent') || combined.includes('attendance')) return { icon: ClipboardList, bg: 'bg-amber-100',  color: 'text-amber-600'  }
  if (combined.includes('homework'))                                   return { icon: BookOpen,      bg: 'bg-blue-100',   color: 'text-blue-600'   }
  if (combined.includes('grade') || combined.includes('exam'))         return { icon: BarChart2,     bg: 'bg-purple-100', color: 'text-purple-600' }
  if (combined.includes('enroll') || combined.includes('student'))     return { icon: GraduationCap, bg: 'bg-indigo-100', color: 'text-indigo-600' }
  if (combined.includes('teacher'))                                    return { icon: UserCheck,     bg: 'bg-green-100',  color: 'text-green-600'  }
  return                                                               { icon: Activity,     bg: 'bg-gray-100',   color: 'text-gray-500'   }
}

function getItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object' && 'results' in payload && Array.isArray((payload as { results?: unknown[] }).results)) {
    return ((payload as { results: T[] }).results)
  }
  return []
}

function getCount(payload: unknown): number {
  if (payload && typeof payload === 'object' && 'count' in payload && typeof (payload as { count?: unknown }).count === 'number') {
    return (payload as { count: number }).count
  }
  return getItems(payload).length
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string | number
  sub: React.ReactNode
  icon: React.ElementType
  iconBg: string
  iconColor: string
  onClick?: () => void
}

function StatCard({ title, value, sub, icon: Icon, iconBg, iconColor, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={`flex min-w-0 flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5
        ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
      </div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  )
}

interface DashboardCardProps {
  title: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  actionLabel: string
  onAction: () => void
  children: React.ReactNode
}

function DashboardCard({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  actionLabel,
  onAction,
  children,
}: DashboardCardProps) {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:min-h-[260px] lg:min-h-[320px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {children}
      </div>

      <button
        onClick={onAction}
        className="mt-4 w-full text-xs font-medium py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-600"
      >
        {actionLabel}
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-admin'],
    queryFn: () => api.get('/dashboard/admin/').then(r => r.data),
  })

  const { data: classesData } = useQuery({
    queryKey: ['dashboard-classes-count'],
    queryFn: () => api.get('/classes/').then(r => r.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ['dashboard-users-count'],
    queryFn: () => api.get('/users/', { params: { page_size: 1 } }).then(r => r.data),
  })

  const { data: homeworksData } = useQuery({
    queryKey: ['dashboard-homeworks'],
    queryFn: () => api.get('/homeworks/', { params: { page_size: 1000 } }).then(r => r.data),
  })

  const { data: lessonPlansData } = useQuery({
    queryKey: ['dashboard-lesson-plans'],
    queryFn: () => api.get('/lesson-plans/', { params: { page_size: 1000 } }).then(r => r.data),
  })

  const { data: studentsData } = useQuery({
    queryKey: ['dashboard-students-distribution'],
    queryFn: () => api.get('/students/', { params: { page_size: 1000 } }).then(r => r.data),
  })

  const { data: attendanceData } = useQuery({
    queryKey: ['dashboard-attendance-week'],
    queryFn: () => api.get('/attendance/', { params: { page_size: 5000 } }).then(r => r.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const att           = data?.attendance_today
  const attRate       = att?.rate ?? 0
  const attC          = attendanceColors(attRate)
  const totalStudents = data?.total_students ?? 0
  const totalTeachers = data?.total_teachers ?? 0
  const studentsInactive = data?.students_inactive ?? 0
  const studentsNewMonth = data?.students_joined_this_month ?? 0
  const teachersNewMonth = data?.teachers_joined_this_month ?? 0
  const studentRollTotal = totalStudents + studentsInactive
  const activeStudentPct =
    studentRollTotal > 0 ? Math.round((totalStudents / studentRollTotal) * 100) : 100
  const present       = att?.present ?? Math.round(totalStudents * attRate / 100)
  const absent        = att?.absent  ?? (totalStudents - present)
  const classesCount = getCount(classesData)
  const usersCount = getCount(usersData)
  const homeworks = getItems<HomeworkItem>(homeworksData)
  const lessonPlans = getItems<LessonPlanItem>(lessonPlansData)
  const students = getItems<StudentItem>(studentsData)
  const attendanceRecords = getItems<AttendanceRecord>(attendanceData)
  const homeworkAssigned = homeworks.length
  const homeworkSubmitted = homeworks.reduce((sum, hw) => sum + (hw.submission_count ?? 0), 0)
  const lessonAssigned = lessonPlans.length
  const lessonPending = data?.pending_lesson_plans
    ?? lessonPlans.filter((plan) => ['submitted', 'coordinator_approved'].includes(plan.status)).length
  const lessonSubmitted = Math.max(lessonAssigned - lessonPending, 0)
  const activity = data?.recent_activity ?? []

  const gradeDistribution = Object.entries(
    students.reduce<Record<string, number>>((acc, student) => {
      const grade = student.assigned_class_detail?.grade_level
      if (!grade) return acc
      acc[grade] = (acc[grade] ?? 0) + 1
      return acc
    }, {})
  )
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }))

  const maxGradeCount = Math.max(...gradeDistribution.map(g => g.count), 1)

  const attendanceWeek = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const key = date.toISOString().split('T')[0]
    const dayRecords = attendanceRecords.filter(record => record.date === key)
    const total = dayRecords.length
    const presentCount = dayRecords.filter(record => record.status === 'present').length
    return {
      key,
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      rate: total ? Math.round((presentCount / total) * 100) : 0,
      total,
      isToday: key === new Date().toISOString().split('T')[0],
    }
  })

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-w-0 space-y-7 pb-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">School Overview</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl border border-gray-200 bg-white transition-colors hover:bg-gray-50 sm:self-auto"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* ── Section 1: Core Stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={totalStudents}
          icon={GraduationCap}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          sub={
            totalStudents === 0 && studentsInactive === 0 ? (
              'No students in the database'
            ) : (
              <span className="flex items-center gap-1 flex-wrap">
                {(studentsNewMonth > 0 || studentsInactive > 0) && (
                  <TrendingUp className="w-3 h-3 text-blue-400 shrink-0" />
                )}
                <span>
                  {[
                    studentRollTotal > 0 ? `${activeStudentPct}% active` : null,
                    studentsNewMonth > 0 ? `${studentsNewMonth} new this month` : null,
                    studentsInactive > 0 ? `${studentsInactive} inactive` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </span>
              </span>
            )
          }
          onClick={() => navigate('/students')}
        />
        <StatCard
          title="Total Teachers"
          value={totalTeachers}
          icon={UserCheck}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          sub={
            teachersNewMonth > 0
              ? `${teachersNewMonth} joined this month`
              : 'No new teachers this month'
          }
          onClick={() => navigate('/teachers')}
        />
        <StatCard
          title="Total Classes"
          value={classesCount}
          icon={School}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          sub={classesCount > 0 ? 'Live class count' : 'No classes yet'}
          onClick={() => navigate('/classes')}
        />
        <StatCard
          title="Total Users"
          value={usersCount}
          icon={Users}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          sub={usersCount > 0 ? 'Active system users' : 'No users found'}
          onClick={() => navigate('/users')}
        />
      </div>

      {/* ── Section 2: Operational Insights ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Attendance Today */}
        <DashboardCard
          title="Attendance Today"
          icon={ClipboardList}
          iconColor={attC.text}
          iconBg={attC.bg}
          actionLabel="View Attendance"
          onAction={() => navigate('/attendance')}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Status</p>
              <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${attC.badge}`}>
                {attC.label}
              </span>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-black leading-none ${attC.text}`}>{attRate}%</p>
              <p className="text-xs text-gray-400 mt-1">Attendance rate</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Present count</span>
              <span className="text-xl font-bold text-gray-900">{present}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600">Absent count</span>
              <span className="text-xl font-bold text-gray-900">{absent}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>0%</span>
              <span>100%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${attC.bar}`}
                style={{ width: `${attRate}%` }}
              />
            </div>
          </div>
        </DashboardCard>

        {/* Lesson Planning */}
        <DashboardCard
          title="Lesson Planning"
          icon={FileText}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          actionLabel="View Lesson Plans"
          onAction={() => navigate('/lesson-plans')}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
              <span className="text-sm text-gray-600">Assigned Lessons</span>
              <span className="text-xl font-bold text-purple-600">{lessonAssigned}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
              <span className="text-sm text-gray-600">Submitted</span>
              <span className="text-xl font-bold text-emerald-600">{lessonSubmitted}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
              <span className="text-sm text-gray-600">Pending Lessons</span>
              <span className="text-xl font-bold text-amber-600">{lessonPending}</span>
            </div>
          </div>
        </DashboardCard>

        {/* Homework Activity */}
        <DashboardCard
          title="Homework Activity"
          icon={BookOpen}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          actionLabel="Homework explorer"
          onAction={() => navigate('/admin/homework-explorer')}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-600">Assigned</span>
              </div>
              <span className="text-xl font-bold text-blue-600">{homeworkAssigned}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm text-gray-600">Submitted</span>
              </div>
              <span className="text-xl font-bold text-emerald-600">{homeworkSubmitted}</span>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* ── Section 3: Attendance Chart + Quick Actions ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Attendance 7-day bar chart */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-800">Attendance — Last 7 Days</h3>
              <p className="mt-0.5 text-xs text-gray-400">Live daily rate from recorded attendance</p>
            </div>
            <BarChart2 className="h-4 w-4 shrink-0 text-gray-400" />
          </div>
          {attendanceWeek.some((d) => d.total > 0) ? (
            <>
              <div className="-mx-1 overflow-x-auto px-1">
              <div className="flex min-w-[280px] items-end gap-1.5 sm:gap-2" style={{ height: '120px' }}>
                {attendanceWeek.map((d) => {
              const isToday  = d.isToday
              const barColor = d.rate >= 90 ? 'bg-emerald-400' : d.rate >= 75 ? 'bg-amber-400' : 'bg-red-400'
              const barH     = Math.round((d.rate / 100) * 80)
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group cursor-default">
                  <span className="text-[10px] text-gray-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                    {d.rate}%
                  </span>
                  <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 group-hover:opacity-75 ${barColor}
                        ${isToday ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                      style={{ height: `${barH}px` }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium leading-none ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                    {d.day}
                  </span>
                </div>
              )
                })}
              </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> ≥90%</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"  /> 75–89%</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"    /> &lt;75%</span>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-gray-400">
              No attendance records available for the last 7 days.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-800">Quick Actions</h3>
          </div>
          <div className="space-y-2.5">
            {([
              { label: 'Add Student',      icon: Plus,          color: 'bg-blue-50   text-blue-600   hover:bg-blue-100',   to: '/students'      },
              { label: 'Take Attendance',  icon: ClipboardList, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100', to: '/attendance'    },
              { label: 'Homework explorer',  icon: BookOpen,      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100', to: '/admin/homework-explorer'      },
              { label: 'Manage Teachers',  icon: UserCheck,     color: 'bg-orange-50 text-orange-600 hover:bg-orange-100', to: '/teachers'      },
              { label: 'Lesson Plans',     icon: FileText,      color: 'bg-pink-50   text-pink-600   hover:bg-pink-100',   to: '/lesson-plans'  },
            ] as const).map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className={`flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left transition-all duration-150 ${action.color}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Section 4: Grade Distribution + Activity Feed ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Student Distribution by Grade */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Students by Grade</h3>
              <p className="text-xs text-gray-400 mt-0.5">Live distribution across enrolled students</p>
            </div>
            <GraduationCap className="w-4 h-4 text-gray-400" />
          </div>
          {gradeDistribution.length > 0 ? (
            <div className="space-y-2.5">
              {gradeDistribution.map((g) => {
              const pct = Math.round((g.count / maxGradeCount) * 100)
              return (
                <div key={g.grade} className="flex items-center gap-3 text-xs">
                  <span className="w-14 text-gray-500 text-right flex-shrink-0 font-medium">{g.grade}</span>
                  <div className="flex-1 h-5 bg-gray-50 rounded-md overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-md flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{g.count}</span>
                    </div>
                  </div>
                </div>
              )
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-gray-400">
              No enrolled students yet.
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-800">Activity Feed</h3>
            </div>
            <span className="text-xs text-gray-400">Latest 10 from activity log</span>
          </div>
          <div className="divide-y divide-gray-50">
            {activity.length > 0 ? activity.map((a) => {
              const { icon: AIcon, bg, color } = activityMeta(a.action, a.description)
              return (
                <div
                  key={a.id}
                  className="px-5 py-3.5 flex items-start gap-3.5 hover:bg-gray-50/60 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <AIcon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{a.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-medium text-gray-500">{a.actor}</span>
                      <span className="text-gray-200">·</span>
                      <Clock className="w-3 h-3 text-gray-300" />
                      <span className="text-xs text-gray-400">{formatDateTime(a.created_at)}</span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                No recent activity yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
