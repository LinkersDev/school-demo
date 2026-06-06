import { useMemo, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, CheckCircle, Pencil, BookOpen, School, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Badge, StatusBadge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { Input, Select } from '../../../components/ui/Input'
import { Table } from '../../../components/ui/Table'
import { TeacherWorkspaceShell } from '../../../components/teacher/TeacherWorkspaceShell'
import { formatDate } from '../../../utils/format'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'

interface Homework {
  id: number
  title: string
  description: string
  subject_detail: { id: number; name: string }
  class_detail: { id: number; name: string }
  due_date: string
  created_at?: string
  status?: string
  max_score: number
  submission_count: number
  created_by_name: string
  progress_percent?: number
}

interface Submission {
  id: number
  student_detail: { id: number; first_name: string; last_name: string }
  status: string
  score: number | null
  feedback: string
  submitted_at: string
  file_url?: string | null
}

const hwSelect =
  'border-indigo-200/65 bg-white/85 text-indigo-950 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/25'
const hwLabel =
  'text-[10px] font-semibold uppercase tracking-wider text-indigo-800/90 sm:text-xs'

export default function HomeworkPage() {
  const navigate = useNavigate()
  const { hasScope, user } = useAuth()
  const qc = useQueryClient()
  const canManage = hasScope('homework.manage')
  const canReadStudents = hasScope('students.read')
  const isTeacher = user?.role === 'teacher'
  const [classFilter, setClassFilter] = useState('')
  const [detailHw, setDetailHw] = useState<Homework | null>(null)
  const [deleteHw, setDeleteHw] = useState<Homework | null>(null)
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes/').then((r) => r.data.results ?? r.data),
    enabled: canReadStudents,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['homeworks', classFilter],
    queryFn: () =>
      api
        .get('/homeworks/', {
          params: {
            ordering: '-created_at',
            page_size: 200,
            ...(classFilter ? { assigned_class: classFilter } : {}),
          },
        })
        .then((r) => r.data),
  })

  const destroy = useMutation({
    mutationFn: (id: number) => api.delete(`/homeworks/${id}/`),
    onSuccess: (_data, deletedId) => {
      qc.invalidateQueries({ queryKey: ['homeworks'] })
      toast.success('Homework deleted')
      setDeleteHw(null)
      setDetailHw((h) => (h?.id === deletedId ? null : h))
    },
    onError: () => toast.error('Failed to delete homework'),
  })

  const homeworks: Homework[] = data?.results ?? data ?? []

  const classOptions = useMemo(() => {
    if (Array.isArray(classesData) && classesData.length > 0) {
      return [...classesData]
        .map((c: { id: number; name: string }) => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }
    const m = new Map<number, string>()
    for (const h of homeworks) {
      if (h.class_detail?.id) {
        m.set(h.class_detail.id, h.class_detail.name)
      }
    }
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [classesData, homeworks])

  const visibleCount = homeworks.length

  if (user?.role === 'admin' || user?.role === 'coordinator') {
    return <Navigate to="/admin/homework-explorer" replace />
  }

  const homeworkModals = (
    <>
      <Modal
        open={!!detailHw}
        onClose={() => setDetailHw(null)}
        title={detailHw?.title ?? 'Submissions'}
        size="2xl"
      >
        {detailHw && (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <p className="mb-4 text-sm text-indigo-900/75">
              {detailHw.subject_detail?.name} · {detailHw.class_detail?.name} · Due{' '}
              {formatDate(detailHw.due_date)}
            </p>
            <SubmissionsList homework={detailHw} canManage={canManage} feedbackOnly={isTeacher} />
          </div>
        )}
      </Modal>

      <Modal open={!!deleteHw} onClose={() => setDeleteHw(null)} title="Delete Homework" size="sm">
        <p className="mb-5 text-sm text-gray-600">
          Delete <strong>{deleteHw?.title}</strong>? All submissions will also be deleted.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteHw(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteHw && destroy.mutate(deleteHw.id)}
            loading={destroy.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  )

  const teacherTableShell =
    'overflow-x-auto rounded-xl border border-white/60 bg-white/85 shadow-sm backdrop-blur-sm [&_thead]:bg-indigo-50/70 [&_th]:text-indigo-800/85 [&_tbody]:bg-white/92'

  if (isTeacher) {
    return (
      <>
        <TeacherWorkspaceShell
          variant="compact"
          title="My homework"
          subtitle={`${visibleCount} assignment${visibleCount === 1 ? '' : 's'}${classFilter ? ' · filtered by class' : ''} · Newest first`}
          heroIcon={BookOpen}
          bodyClassName="flex min-h-0 flex-1 flex-col"
          heroActions={
            <>
              {classOptions.length > 0 && (
                <div className="min-w-[10rem] flex-1 sm:max-w-[12rem] sm:flex-none">
                  <Select
                    label="Class"
                    labelClassName={hwLabel}
                    className={hwSelect}
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                  >
                    <option value="">All classes</option>
                    {classOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                className="min-h-[44px] shrink-0 border-indigo-200/70 bg-white/70 text-indigo-900 shadow-sm backdrop-blur-sm"
                onClick={() => navigate('/homework/history')}
              >
                <BarChart3 className="h-4 w-4" aria-hidden />
                History and stats
              </Button>
              {canManage && (
                <Button
                  onClick={() => navigate('/homework/create')}
                  className="min-h-[44px] shrink-0 border-indigo-200/70 bg-indigo-600 text-white shadow-md shadow-indigo-900/20 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" /> Create
                </Button>
              )}
            </>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="max-h-[calc(100vh-12.5rem)] min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto">
              <Table<Homework>
                  loading={isLoading}
                  emptyMessage={
                    classFilter
                      ? 'No homework for this class.'
                      : 'You have not created any homework yet — use Create to add one.'
                  }
                  wrapperClassName={teacherTableShell}
                  columns={[
                    {
                      header: 'Title',
                      className: 'py-2 align-middle',
                      render: (hw) => (
                        <button
                          type="button"
                          className="max-w-[14rem] text-left text-sm font-medium text-indigo-950 hover:text-indigo-700 sm:max-w-xs"
                          onClick={() => setDetailHw(hw)}
                        >
                          {hw.title}
                        </button>
                      ),
                    },
                    {
                      header: 'Class',
                      className: 'py-2 align-middle text-xs text-indigo-900/90',
                      render: (hw) => hw.class_detail?.name ?? '—',
                    },
                    {
                      header: 'Subject',
                      className: 'py-2 align-middle text-xs text-indigo-900/90',
                      render: (hw) => hw.subject_detail?.name ?? '—',
                    },
                    {
                      header: 'Due',
                      className: 'py-2 align-middle whitespace-nowrap text-xs text-indigo-900/85',
                      render: (hw) => formatDate(hw.due_date),
                    },
                    {
                      header: 'Submissions',
                      className: 'py-2 align-middle',
                      render: (hw) => (
                        <div className="flex flex-wrap items-center gap-1">
                          {hw.status === 'draft' && <Badge color="gray">Draft</Badge>}
                          <Badge color="blue">{hw.submission_count} submitted</Badge>
                          {typeof hw.progress_percent === 'number' && hw.submission_count > 0 && (
                            <Badge color="green">{Math.round(hw.progress_percent)}%</Badge>
                          )}
                        </div>
                      ),
                    },
                    {
                      header: '',
                      className: 'w-px py-2 align-middle',
                      render: (hw) => (
                        <div
                          className="flex justify-end gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {canManage && hw.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => navigate(`/homework/${hw.id}/edit`)}
                              title="Edit draft"
                              className="rounded-lg p-1.5 text-indigo-400 transition hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setDeleteHw(hw)}
                              title="Delete homework"
                              className="rounded-lg p-1.5 text-indigo-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  data={homeworks}
                />
            </div>
          </div>
        </TeacherWorkspaceShell>
        {homeworkModals}
      </>
    )
  }

  return (
    <div className="relative -m-3 min-h-full overflow-x-hidden overflow-y-visible sm:-m-4 md:-m-6 md:overflow-hidden p-3 pb-8 pt-3 sm:p-4 sm:pt-4 md:p-6 md:pt-6">
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
        className="pointer-events-none absolute top-1/4 right-[8%] h-40 w-40 rounded-full bg-amber-200/30 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/30 px-5 py-5 shadow-md shadow-indigo-900/10 backdrop-blur-md sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden shrink-0 rounded-xl bg-indigo-600 p-2.5 text-white shadow-md shadow-indigo-900/20 ring-2 ring-indigo-400/25 sm:flex">
                <BookOpen className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-indigo-950 sm:text-2xl">
                  {isTeacher ? 'My homework' : 'Homework'}
                </h1>
                <p className="mt-1 text-xs text-indigo-900/75 sm:text-sm">
                  {isTeacher
                    ? `${visibleCount} assignment${visibleCount === 1 ? '' : 's'} you created${classFilter ? ' · filtered by your class' : ''} · Newest first · Open a card for submissions and progress`
                    : `${visibleCount} homework item${visibleCount === 1 ? '' : 's'}${classFilter ? ' · filtered by class' : ''} · Newest first · Tap a card for submissions`}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              {classOptions.length > 0 && (
                <div className="min-w-[12rem] shrink-0">
                  <Select
                    label="Class"
                    labelClassName={hwLabel}
                    className={hwSelect}
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                  >
                    <option value="">All classes</option>
                    {classOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {canManage && (
                <Button
                  onClick={() => navigate('/homework/create')}
                  className="min-h-[44px] shrink-0 border-indigo-200/70 bg-indigo-600 text-white shadow-md shadow-indigo-900/20 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" /> Create homework
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="pb-2">
          <HomeworkCardList
            homeworks={homeworks}
            isLoading={isLoading}
            classFilter={classFilter}
            isTeacher={isTeacher}
            canManage={canManage}
            onOpenDetail={setDetailHw}
            onRequestDelete={setDeleteHw}
          />
        </div>

        {homeworkModals}
      </div>
    </div>
  )
}

function HomeworkCardList({
  homeworks,
  isLoading,
  classFilter,
  isTeacher,
  canManage,
  onOpenDetail,
  onRequestDelete,
}: {
  homeworks: Homework[]
  isLoading: boolean
  classFilter: string
  isTeacher: boolean
  canManage: boolean
  onOpenDetail: (hw: Homework) => void
  onRequestDelete: (hw: Homework) => void
}) {
  const navigate = useNavigate()

  return (
    <>
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm"
            />
          ))}
        </div>
      )}

      {!isLoading && homeworks.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {homeworks.map((hw) => (
            <div
              key={hw.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenDetail(hw)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpenDetail(hw)
                }
              }}
              className="group relative cursor-pointer rounded-xl border border-white/60 bg-white/85 p-4 shadow-sm outline-none backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-900/10 focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-indigo-400/80 via-violet-400/60 to-teal-400/70 opacity-90" />

              <div className="flex gap-3 pt-0.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-base font-bold text-indigo-700 ring-2 ring-white/80 shadow-inner">
                  {(hw.title?.trim().charAt(0) || '?').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 pr-16">
                  <div className="line-clamp-2 font-semibold leading-snug text-indigo-950 transition-colors group-hover:text-indigo-700">
                    {hw.title}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-indigo-700/75">
                    <School className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{hw.class_detail?.name ?? '—'}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-violet-800/80">{hw.subject_detail?.name ?? '—'}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-indigo-100/60 pt-3">
                <span className="text-[11px] text-indigo-900/70">Due {formatDate(hw.due_date)}</span>
                {hw.status === 'draft' && <Badge color="gray">Draft</Badge>}
                <Badge color="blue">{hw.submission_count} submitted</Badge>
                {typeof hw.progress_percent === 'number' && hw.submission_count > 0 && (
                  <Badge color="green">{Math.round(hw.progress_percent)}%</Badge>
                )}
              </div>

              <div
                className="absolute right-2 top-3 flex gap-0.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {canManage && hw.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => navigate(`/homework/${hw.id}/edit`)}
                    title="Edit draft"
                    className="rounded-lg p-1.5 text-indigo-400 transition hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => onRequestDelete(hw)}
                    title="Delete homework"
                    className="rounded-lg p-1.5 text-indigo-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && homeworks.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/60 bg-white/35 py-16 text-center text-sm text-indigo-800/80 shadow-sm backdrop-blur-sm">
          {classFilter
            ? 'No homework for this class.'
            : isTeacher
              ? 'You have not created any homework yet — use Create homework to add one.'
              : 'No homework yet — use Create homework to add one.'}
        </div>
      )}
    </>
  )
}

function SubmissionsList({
  homework,
  canManage,
  feedbackOnly = false,
}: {
  homework: Homework
  canManage: boolean
  feedbackOnly?: boolean
}) {
  const qc = useQueryClient()
  const [gradingId, setGradingId] = useState<number | null>(null)
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '', status: 'graded' })

  const { data } = useQuery({
    queryKey: ['hw-submissions', homework.id],
    queryFn: () => api.get(`/homeworks/${homework.id}/submissions/`).then((r) => r.data),
  })

  const gradeMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: object }) => api.patch(`/homework-submissions/${id}/`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hw-submissions', homework.id] })
      toast.success(feedbackOnly ? 'Feedback saved' : 'Grade saved')
      setGradingId(null)
    },
    onError: () => toast.error(feedbackOnly ? 'Failed to save feedback' : 'Failed to save grade'),
  })

  const submissions: Submission[] = Array.isArray(data) ? data : (data?.results ?? [])

  return (
    <div className="rounded-xl border border-indigo-100/80 bg-indigo-50/20">
      {submissions.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-indigo-500/80">No submissions yet</div>
      ) : (
        <div className="divide-y divide-indigo-100/60">
          {submissions.map((s) => (
            <div key={s.id} className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-indigo-950">
                  {s.student_detail.first_name} {s.student_detail.last_name}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  {s.file_url && (
                    <a
                      href={s.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      View upload
                    </a>
                  )}
                  {!feedbackOnly && s.score !== null && (
                    <span className="font-medium text-indigo-900/85">
                      {s.score}/{homework.max_score}
                    </span>
                  )}
                  <StatusBadge status={s.status} />
                  {canManage && gradingId !== s.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setGradingId(s.id)
                        setGradeForm({
                          score: String(s.score ?? ''),
                          feedback: s.feedback ?? '',
                          status: s.score !== null ? 'graded' : 'submitted',
                        })
                      }}
                      className="flex items-center gap-1 text-xs text-indigo-600 transition hover:text-indigo-800"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> {feedbackOnly ? 'Feedback' : 'Grade'}
                    </button>
                  )}
                </div>
              </div>

              {gradingId === s.id && (
                <div className="mt-3 space-y-2 rounded-lg border border-indigo-100 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                  {feedbackOnly ? (
                    <Input
                      label="Feedback"
                      value={gradeForm.feedback}
                      onChange={(e) => setGradeForm((p) => ({ ...p, feedback: e.target.value }))}
                    />
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        label="Score"
                        type="number"
                        min={0}
                        max={homework.max_score}
                        value={gradeForm.score}
                        onChange={(e) => setGradeForm((p) => ({ ...p, score: e.target.value }))}
                        placeholder={`/ ${homework.max_score}`}
                      />
                      <div className="col-span-2">
                        <Input
                          label="Feedback (optional)"
                          value={gradeForm.feedback}
                          onChange={(e) => setGradeForm((p) => ({ ...p, feedback: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setGradingId(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      loading={gradeMutation.isPending}
                      onClick={() =>
                        feedbackOnly
                          ? gradeMutation.mutate({
                              id: s.id,
                              d: { feedback: gradeForm.feedback },
                            })
                          : gradeMutation.mutate({
                              id: s.id,
                              d: {
                                score: gradeForm.score ? Number(gradeForm.score) : null,
                                feedback: gradeForm.feedback,
                                status: gradeForm.score ? 'graded' : s.status,
                              },
                            })
                      }
                    >
                      {feedbackOnly ? 'Save feedback' : 'Save grade'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
