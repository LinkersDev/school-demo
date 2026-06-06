import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  GraduationCap, ClipboardList, BookOpen, BarChart2,
  CheckCircle2, Clock, Send, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate } from '../../utils/format'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import SubmitHomeworkModal from '../../modules/parent/components/SubmitHomeworkModal'
import type { ParentHomeworkRow } from '../../modules/parent/services/parentPortal.service'

interface Child {
  id: number
  name: string
  student_id: string
  class: string | null
  class_id: number | null
  recent_attendance: { date: string; status: string }[]
  recent_homework: ParentHomeworkRow[]
  recent_grades: { exam: string; subject: string; score: number; max_score: number; percentage: number }[]
}

function HomeworkCard({ child }: { child: Child }) {
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState<ParentHomeworkRow | null>(null)
  const items = expanded ? child.recent_homework : child.recent_homework.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Homework
        </h3>
      </CardHeader>
      <div className="divide-y divide-gray-50">
        {items.map(h => {
          const isGraded = h.submission?.status === 'graded'
          const isSubmitted = h.submitted

          return (
            <div key={h.id} className="px-6 py-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{h.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {h.subject__name} · Due {formatDate(h.due_date)}
                  </div>
                  {isGraded && h.submission && (
                    <div className="text-xs text-green-600 mt-0.5 font-medium">
                      Graded: {h.submission.score}/{h.max_score}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {isGraded ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Graded
                    </span>
                  ) : isSubmitted ? (
                    <span className="flex items-center gap-1 text-xs text-blue-500 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Submitted
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSubmitting(h)}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Submit
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {child.recent_homework.length === 0 && (
          <CardBody><p className="text-sm text-gray-400">No homework assigned</p></CardBody>
        )}
      </div>
      {child.recent_homework.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition cursor-pointer border-t border-gray-50"
        >
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all ({child.recent_homework.length})</>}
        </button>
      )}

      {submitting && (
        <SubmitHomeworkModal
          homework={submitting}
          studentId={child.id}
          onClose={() => setSubmitting(null)}
        />
      )}
    </Card>
  )
}

export default function ParentDashboard() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-parent'],
    queryFn: () => api.get('/dashboard/parent/').then(r => r.data),
  })

  const children: Child[] = data?.children ?? []
  const [activeChild, setActiveChild] = useState(0)
  const child = children[activeChild]

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading dashboard…</div>

  if (!child) {
    return (
      <div className="text-center py-20">
        <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No children linked to your account yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.full_name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Parent Dashboard</p>
        <div className="flex flex-wrap gap-3 mt-4 text-sm">
          <Link
            to={`/parent/attendance?student=${child.id}`}
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
          >
            <ClipboardList className="w-4 h-4" /> Full attendance
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            to={`/parent/homework?student=${child.id}`}
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
          >
            <BookOpen className="w-4 h-4" /> All homework
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            to={`/parent/grades?student=${child.id}`}
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
          >
            <BarChart2 className="w-4 h-4" /> All grades
          </Link>
        </div>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveChild(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeChild === i
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center gap-4">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold flex-shrink-0">
          {child.name.charAt(0)}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{child.name}</h2>
          <p className="text-sm text-gray-500">{child.student_id} · Class: {child.class ?? 'Not assigned'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Recent Attendance
            </h3>
          </CardHeader>
          <div className="divide-y divide-gray-50">
            {child.recent_attendance.map((a, i) => (
              <div key={i} className="px-6 py-3 flex justify-between text-sm">
                <span className="text-gray-600">{formatDate(a.date)}</span>
                <StatusBadge status={a.status} />
              </div>
            ))}
            {child.recent_attendance.length === 0 && (
              <CardBody><p className="text-sm text-gray-400">No records</p></CardBody>
            )}
          </div>
        </Card>

        <HomeworkCard child={child} />

        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Recent Grades
            </h3>
          </CardHeader>
          <div className="divide-y divide-gray-50">
            {child.recent_grades.map((g, i) => (
              <div key={i} className="px-6 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{g.exam}</span>
                  <span className={`font-bold ${g.percentage >= 75 ? 'text-green-600' : g.percentage >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {g.percentage}%
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{g.subject} · {g.score}/{g.max_score}</div>
              </div>
            ))}
            {child.recent_grades.length === 0 && (
              <CardBody><p className="text-sm text-gray-400">No grades yet</p></CardBody>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
