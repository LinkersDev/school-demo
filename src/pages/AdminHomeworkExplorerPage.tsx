import { useEffect, useMemo, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, FolderOpen } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Table } from '../components/ui/Table'
import { formatDate } from '../utils/format'
import api from '../services/api'

interface ClassRow {
  id: number
  name: string
  grade_level: string
}

interface SubjectRow {
  id: number
  name: string
  code: string
}

interface HomeworkRow {
  id: number
  title: string
  due_date: string
  teacher_name: string
  submission_count: number
  class_enrollment_count: number
  missing_count: number
  progress_percent: number
}

interface RosterStudent {
  student: { id: number; first_name: string; last_name: string; student_id: string }
  status: string
}

interface RosterTableRow extends RosterStudent {
  id: number
}

interface ClassRosterResponse {
  homework_id: number
  class_enrollment_count: number
  submitted_count: number
  missing_count: number
  graded_count: number
  students: RosterStudent[]
}

const sectionLabel =
  'text-[10px] font-semibold uppercase tracking-wider text-indigo-800/90 sm:text-xs'

const tableShell =
  'border-white/50 bg-white/75 shadow-sm shadow-indigo-900/5 backdrop-blur-sm [&_thead]:bg-indigo-50/70 [&_th]:text-indigo-800/80'

function unwrapResults<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: T[] }).results)) {
    return (data as { results: T[] }).results
  }
  return []
}

function ProgressBar({ pct }: { pct: number }) {
  const w = Math.min(100, Math.max(0, pct))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100/90">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all"
        style={{ width: `${w}%` }}
      />
    </div>
  )
}

function ExplorerShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative -m-3 min-h-full overflow-x-hidden p-3 pb-6 pt-3 sm:-m-4 sm:p-4 sm:pb-8 sm:pt-4 md:-m-6 md:overflow-hidden md:p-6 md:pb-8 md:pt-6">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-100/95 via-violet-50/85 to-amber-50/60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-32 left-[-10%] h-56 w-[65%] max-w-3xl rounded-full bg-teal-200/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[8%] top-1/4 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 min-w-0">{children}</div>
    </div>
  )
}

function HomeworkListView() {
  const [sp, setSp] = useSearchParams()
  const classId = sp.get('class')
  const subjectId = sp.get('subject')

  const { data: classes = [], isLoading: clsLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get<ClassRow[]>('/classes/').then((r) => unwrapResults<ClassRow>(r.data)),
  })

  const { data: subjectsMerged = [], isLoading: subjLoading } = useQuery({
    queryKey: ['admin-hw-explorer-subjects', classId],
    enabled: Boolean(classId),
    queryFn: async () => {
      const [forClass, global] = await Promise.all([
        api.get<SubjectRow[]>('/subjects/', { params: { assigned_class: classId } }).then((r) => unwrapResults<SubjectRow>(r.data)),
        api
          .get<SubjectRow[]>('/subjects/', { params: { assigned_class__isnull: true } })
          .then((r) => unwrapResults<SubjectRow>(r.data)),
      ])
      const byId = new Map<number, SubjectRow>()
      for (const s of [...forClass, ...global]) {
        byId.set(s.id, s)
      }
      return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
    },
  })

  const { data: homeworks = [], isLoading: hwLoading } = useQuery({
    queryKey: ['homeworks', classId, subjectId],
    enabled: Boolean(classId && subjectId),
    queryFn: () =>
      api
        .get<HomeworkRow[]>('/homeworks/', { params: { assigned_class: classId, subject: subjectId } })
        .then((r) => unwrapResults<HomeworkRow>(r.data)),
  })

  useEffect(() => {
    if (classes.length && !classId) {
      setSp({ class: String(classes[0].id) }, { replace: true })
    }
  }, [classes, classId, setSp])

  useEffect(() => {
    if (subjectsMerged.length && !subjectId && classId) {
      setSp({ class: classId, subject: String(subjectsMerged[0].id) }, { replace: true })
    }
  }, [subjectsMerged, subjectId, classId, setSp])

  const selectedClass = useMemo(() => classes.find((c) => String(c.id) === classId), [classes, classId])

  return (
    <ExplorerShell>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/30 px-5 py-5 shadow-md shadow-indigo-900/10 backdrop-blur-md sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden shrink-0 rounded-xl bg-indigo-600 p-2.5 text-white shadow-md shadow-indigo-900/20 ring-2 ring-indigo-400/25 sm:flex">
                <FolderOpen className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-indigo-950 sm:text-2xl">Homework explorer</h1>
                <p className="mt-1 text-xs text-indigo-900/75 sm:text-sm">
                  Browse by class and subject, track submission progress, and open the class roster for any assignment.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div>
          <h2 className={`mb-3 ${sectionLabel}`}>Class</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clsLoading ? (
              <p className="text-sm text-indigo-700/70">Loading classes…</p>
            ) : (
              classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSp({ class: String(c.id), subject: '' }, { replace: true })}
                >
                  <Card
                    className={`relative h-full overflow-hidden border p-4 text-left shadow-sm backdrop-blur-sm transition ${
                      String(c.id) === classId
                        ? 'border-indigo-400/60 bg-white/90 ring-2 ring-indigo-400/40'
                        : 'border-white/50 bg-white/80 hover:border-indigo-200/80 hover:shadow-md hover:shadow-indigo-900/5'
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-indigo-400/70 via-violet-400/50 to-teal-400/60 opacity-90" />
                    <div className="font-semibold text-indigo-950">{c.name}</div>
                    <div className="mt-1 text-xs text-indigo-800/65">{c.grade_level}</div>
                  </Card>
                </button>
              ))
            )}
          </div>
        </div>

        {classId ? (
          <div>
            <h2 className={`mb-3 ${sectionLabel}`}>
              Subjects {selectedClass ? `— ${selectedClass.name}` : ''}
            </h2>
            {subjLoading ? (
              <p className="text-sm text-indigo-700/70">Loading subjects…</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjectsMerged.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSp({ class: classId, subject: String(s.id) }, { replace: true })}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      String(s.id) === subjectId
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-900/15'
                        : 'border-teal-200/60 bg-white/80 text-teal-950 backdrop-blur-sm hover:border-indigo-300/70 hover:bg-white/95'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {classId && subjectId ? (
          <div>
            <h2 className={`mb-3 ${sectionLabel}`}>Assignments</h2>
            <Table<HomeworkRow>
              loading={hwLoading}
              emptyMessage="No homework for this class and subject."
              wrapperClassName={tableShell}
              columns={[
                {
                  header: 'Title',
                  render: (row) => (
                    <Link
                      to={`/admin/homework-explorer/${row.id}`}
                      className="font-medium text-indigo-700 hover:text-indigo-950"
                    >
                      {row.title}
                    </Link>
                  ),
                },
                { header: 'Teacher', accessor: 'teacher_name' },
                {
                  header: 'Due',
                  render: (row) => <span className="text-indigo-900/85">{formatDate(row.due_date)}</span>,
                },
                {
                  header: 'Progress',
                  render: (row) => (
                    <div className="min-w-0 space-y-1 sm:min-w-[120px]">
                      <div className="text-xs text-indigo-800/80">
                        {row.submission_count}/{row.class_enrollment_count} submitted
                      </div>
                      <ProgressBar pct={row.progress_percent} />
                    </div>
                  ),
                },
              ]}
              data={homeworks}
            />
          </div>
        ) : null}
      </div>
    </ExplorerShell>
  )
}

function HomeworkDetailView({ homeworkId }: { homeworkId: number }) {
  const { data: hw } = useQuery({
    queryKey: ['homework', homeworkId],
    queryFn: () => api.get<HomeworkRow>(`/homeworks/${homeworkId}/`).then((r) => r.data),
  })

  const { data: roster, isLoading } = useQuery({
    queryKey: ['homework-class-roster', homeworkId],
    queryFn: () => api.get<ClassRosterResponse>(`/homeworks/${homeworkId}/class-roster/`).then((r) => r.data),
  })

  const pct =
    roster && roster.class_enrollment_count > 0
      ? Math.round((roster.submitted_count / roster.class_enrollment_count) * 100)
      : 0

  return (
    <ExplorerShell>
      <div className="space-y-6">
        <Link
          to="/admin/homework-explorer"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to explorer
        </Link>

        <section className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/30 px-5 py-5 shadow-md shadow-indigo-900/10 backdrop-blur-md sm:px-6 sm:py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-900/20 ring-2 ring-indigo-400/25">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-indigo-950 sm:text-2xl">
                {hw?.title ?? `Homework #${homeworkId}`}
              </h1>
              {hw ? (
                <p className="mt-1 text-xs text-indigo-900/75 sm:text-sm">
                  Due {formatDate(hw.due_date)} · {hw.teacher_name}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {roster ? (
          <Card className="border border-white/50 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <div className="mb-4 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <div className={sectionLabel}>Enrollment</div>
                <div className="mt-1 font-semibold text-indigo-950">{roster.class_enrollment_count}</div>
              </div>
              <div>
                <div className={sectionLabel}>Turned in</div>
                <div className="mt-1 font-semibold text-teal-800">{roster.submitted_count}</div>
              </div>
              <div>
                <div className={sectionLabel}>Missing</div>
                <div className="mt-1 font-semibold text-red-700">{roster.missing_count}</div>
              </div>
            </div>
            <ProgressBar pct={pct} />
          </Card>
        ) : null}

        <h2 className={sectionLabel}>Students</h2>
        <Table<RosterTableRow>
          loading={isLoading}
          emptyMessage="No roster data."
          wrapperClassName={tableShell}
          data={(roster?.students ?? []).map((s) => ({ ...s, id: s.student.id }))}
          columns={[
            {
              header: 'Student',
              render: (row) => (
                <span className="text-indigo-950">
                  {row.student.first_name} {row.student.last_name}{' '}
                  <span className="text-xs text-indigo-700/55">({row.student.student_id})</span>
                </span>
              ),
            },
            {
              header: 'Status',
              render: (row) => {
                const ok = row.status === 'submitted' || row.status === 'graded'
                const late = row.status === 'late'
                return (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      ok || late ? 'bg-teal-100 text-teal-900' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {row.status}
                  </span>
                )
              },
            },
          ]}
        />
      </div>
    </ExplorerShell>
  )
}

export default function AdminHomeworkExplorerPage() {
  const { homeworkId } = useParams()
  const id = homeworkId ? Number(homeworkId) : NaN
  if (homeworkId && Number.isFinite(id)) {
    return <HomeworkDetailView homeworkId={id} />
  }
  return <HomeworkListView />
}
