import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, ClipboardList, GraduationCap } from 'lucide-react'
import { Button } from '../components/ui/Button'
import api from '../services/api'
import { TeacherWorkspaceShell } from '../components/teacher/TeacherWorkspaceShell'

const PAGE_SIZE = 500

interface TeacherClass {
  id: number
  name: string
  grade_level: string
  academic_year: string
}

export default function TeacherMyClassesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-my-classes', PAGE_SIZE],
    queryFn: () =>
      api.get('/classes/', { params: { page_size: PAGE_SIZE } }).then((r) => r.data.results ?? r.data),
  })

  const classes: TeacherClass[] = Array.isArray(data) ? data : []

  return (
    <TeacherWorkspaceShell
      title="My classes"
      subtitle="Classes assigned to you — attendance and students are scoped to these groups."
      heroIcon={GraduationCap}
    >
      {isLoading ? (
        <p className="text-sm text-indigo-700/70">Loading classes…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((c) => (
            <div
              key={c.id}
              className="relative overflow-hidden rounded-xl border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-900/10"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-indigo-400/80 via-violet-400/60 to-teal-400/70 opacity-90" />
              <div className="flex items-start gap-3 pt-0.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 ring-2 ring-white/80">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-indigo-950">{c.name}</h3>
                  <p className="mt-1 text-xs text-indigo-800/70">{c.grade_level}</p>
                  <p className="mt-2 text-xs text-indigo-800/55">Year: {c.academic_year}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-indigo-100/60 pt-4">
                <Link to="/attendance" className="min-w-0">
                  <Button
                    size="sm"
                    className="min-h-[44px] border-indigo-200/70 bg-indigo-600 text-white shadow-md shadow-indigo-900/15 hover:bg-indigo-700"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Attendance
                  </Button>
                </Link>
                <Link to="/students" className="min-w-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-h-[44px] border-teal-200/70 bg-white/80 text-teal-950 backdrop-blur-sm"
                  >
                    <BookOpen className="h-4 w-4" />
                    Students
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && classes.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/60 bg-white/35 py-16 text-center text-sm text-indigo-800/80 shadow-sm backdrop-blur-sm">
          No classes are assigned to you yet.
        </div>
      )}
    </TeacherWorkspaceShell>
  )
}
