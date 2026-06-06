import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileDown, FileText, Loader2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Select } from '../../../components/ui/Input'
import { TeacherWorkspaceShell } from '../../../components/teacher/TeacherWorkspaceShell'
import { formatDate } from '../../../utils/format'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'
import {
  fetchAllLessonPlansList,
  lessonPlanStatusProgress,
  ProgressBar,
  subjectIdFromPlan,
  unwrapResults,
  type ClassRow,
  type LessonPlan,
} from '../lessonPlanShared'
import {
  downloadLessonPlanDocx,
  downloadLessonPlanPdf,
  type LessonPlanExportSource,
} from '../../../utils/lessonPlanExport'
import { SCHOOL_NAME_EXPORT } from '../../../constants/school'

const filterSelect =
  'border-indigo-200/65 bg-white/90 text-indigo-950 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/25 text-sm'
const filterLabel = 'text-[10px] font-semibold uppercase tracking-wider text-indigo-800/90'

function toExportSource(row: LessonPlan): LessonPlanExportSource {
  const { label } = lessonPlanStatusProgress(row.status)
  return {
    title: row.title,
    objectives: row.objectives,
    activities: row.activities,
    materials: row.materials,
    className: row.class_detail?.name ?? '—',
    subjectName: row.subject_detail?.name ?? '—',
    weekRange: row.week_start
      ? `${formatDate(row.week_start)}${row.week_end ? ` – ${formatDate(row.week_end)}` : ''}`
      : '—',
    status: row.status,
    statusLabel: label,
  }
}

function previewSnippet(text: string, max = 280): string {
  const t = (text || '').trim()
  if (t.length <= max) return t || '—'
  return `${t.slice(0, max)}…`
}

export default function TeacherLessonPlansHistoryPage() {
  const navigate = useNavigate()
  const { hasScope } = useAuth()
  const canRead = hasScope('lessonplans.read')
  const canManage = hasScope('lessonplans.manage')
  const [filterClass, setFilterClass] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [exportingId, setExportingId] = useState<number | null>(null)
  const [exportKind, setExportKind] = useState<'pdf' | 'docx' | null>(null)

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', 'lp-history'],
    queryFn: () =>
      api
        .get('/classes/', { params: { page_size: 500 } })
        .then((r) => unwrapResults<ClassRow>(r.data)),
    enabled: canRead,
  })

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['lesson-plans', 'teacher-history'],
    queryFn: fetchAllLessonPlansList,
    enabled: canRead,
  })

  const subjectOptions = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of plans) {
      if (filterClass && String(p.assigned_class) !== filterClass) continue
      const sid = subjectIdFromPlan(p)
      if (!sid) continue
      const id = Number(sid)
      if (Number.isNaN(id)) continue
      if (!m.has(id)) m.set(id, p.subject_detail?.name ?? `Subject ${sid}`)
    }
    return [...m.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }))
  }, [plans, filterClass])

  useEffect(() => {
    if (!filterSubject) return
    if (!subjectOptions.some((s) => String(s.id) === filterSubject)) setFilterSubject('')
  }, [filterClass, subjectOptions, filterSubject])

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (filterClass && String(p.assigned_class) !== filterClass) return false
      if (filterSubject && subjectIdFromPlan(p) !== filterSubject) return false
      return true
    })
  }, [plans, filterClass, filterSubject])

  const selected = useMemo(
    () => (selectedId != null ? filteredPlans.find((p) => p.id === selectedId) ?? null : null),
    [filteredPlans, selectedId],
  )

  useEffect(() => {
    if (!filteredPlans.length) {
      setSelectedId(null)
      return
    }
    const still = selectedId != null && filteredPlans.some((p) => p.id === selectedId)
    if (!still) setSelectedId(filteredPlans[0].id)
  }, [filteredPlans, selectedId])

  const runExport = async (row: LessonPlan, kind: 'pdf' | 'docx') => {
    const payload = toExportSource(row)
    setExportingId(row.id)
    setExportKind(kind)
    try {
      if (kind === 'pdf') {
        downloadLessonPlanPdf(payload)
      } else {
        await downloadLessonPlanDocx(payload)
      }
      toast.success(kind === 'pdf' ? 'PDF downloaded' : 'Word downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingId(null)
      setExportKind(null)
    }
  }

  const openInEditor = (p: LessonPlan) => {
    const c = String(p.assigned_class)
    const s = subjectIdFromPlan(p)
    navigate(`/my-lesson-plans?class=${c}&subject=${s}&openEdit=${p.id}`)
  }

  if (!canRead) {
    return (
      <div className="relative -m-3 p-3 sm:-m-4 sm:p-4 md:-m-6 md:p-6">
        <p className="text-sm text-indigo-900/80">You do not have permission to view this page.</p>
      </div>
    )
  }

  return (
    <TeacherWorkspaceShell
      variant="compact"
      title="Lesson plans"
      subtitle={`${SCHOOL_NAME_EXPORT} · Filter, then tap a plan to preview · ${filteredPlans.length} shown`}
      heroIcon={FileText}
      bodyClassName="flex min-h-0 flex-1 flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/my-lesson-plans')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/55 px-3 py-1.5 text-xs font-medium text-indigo-900 shadow-sm backdrop-blur-sm transition hover:bg-white/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to editor
        </button>
      </div>

      <div className="flex min-h-0 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4">
        <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 lg:w-[min(20rem,100%)] lg:min-h-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Select
              label="Class"
              labelClassName={filterLabel}
              className={filterSelect}
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value)
                setFilterSubject('')
              }}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade_level})
                </option>
              ))}
            </Select>
            <Select
              label="Subject"
              labelClassName={filterLabel}
              className={filterSelect}
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">All subjects</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="max-h-[min(48vh,26rem)] min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/50 bg-white/40 shadow-sm backdrop-blur-sm sm:max-h-[min(52vh,28rem)]">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-indigo-400">Loading…</div>
            ) : filteredPlans.length === 0 ? (
              <div className="p-6 text-center text-sm text-indigo-700/70">No plans match this filter.</div>
            ) : (
              <ul className="divide-y divide-indigo-100/80">
                {filteredPlans.map((p) => {
                  const { label } = lessonPlanStatusProgress(p.status)
                  const active = p.id === selectedId
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`w-full px-3 py-2.5 text-left transition ${
                          active ? 'bg-indigo-600/10' : 'hover:bg-white/50'
                        }`}
                      >
                        <div className="font-medium leading-snug text-indigo-950 line-clamp-2">{p.title}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-indigo-800/75">
                          <span>{p.class_detail?.name ?? '—'}</span>
                          <span className="text-indigo-400">·</span>
                          <span>{p.subject_detail?.name ?? '—'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge color="gray" className="text-[10px]">
                            {label}
                          </Badge>
                          {p.week_start && (
                            <span className="text-[11px] text-indigo-700/75">
                              {formatDate(p.week_start)}
                              {p.week_end ? ` – ${formatDate(p.week_end)}` : ''}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex min-h-[min(52vh,28rem)] min-w-0 flex-1 flex-col rounded-xl border border-white/50 bg-white/45 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          {!selected ? (
            <p className="text-sm text-indigo-700/65">Select a plan on the left to preview.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-indigo-100/70 pb-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-indigo-950">{selected.title}</h2>
                  <p className="mt-1 text-xs text-indigo-800/75">
                    {selected.class_detail?.name ?? '—'} · {selected.subject_detail?.name ?? '—'}
                  </p>
                  {selected.week_start && (
                    <p className="mt-0.5 text-xs text-indigo-700/75">
                      Week {formatDate(selected.week_start)}
                      {selected.week_end ? ` – ${formatDate(selected.week_end)}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="border-indigo-200/70 text-xs"
                    disabled={exportingId === selected.id}
                    onClick={() => void runExport(selected, 'pdf')}
                  >
                    {exportingId === selected.id && exportKind === 'pdf' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
                    PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="border-indigo-200/70 text-xs"
                    disabled={exportingId === selected.id}
                    onClick={() => void runExport(selected, 'docx')}
                  >
                    {exportingId === selected.id && exportKind === 'docx' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
                    Word
                  </Button>
                  {canManage && selected.status === 'draft' && (
                    <Button
                      type="button"
                      size="sm"
                      className="border-teal-200/70 bg-teal-50 text-xs text-teal-900"
                      onClick={() => openInEditor(selected)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-4">
                {(() => {
                  const { pct, label } = lessonPlanStatusProgress(selected.status)
                  return (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-indigo-900/80">Status</div>
                      <div className="text-xs text-indigo-800/85">{label}</div>
                      <ProgressBar pct={pct} />
                    </div>
                  )
                })()}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-800/80">Objectives</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-indigo-900/90">{previewSnippet(selected.objectives)}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-800/80">Activities</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-indigo-900/90">{previewSnippet(selected.activities)}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-800/80">Materials</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-indigo-900/90">{previewSnippet(selected.materials)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </TeacherWorkspaceShell>
  )
}
