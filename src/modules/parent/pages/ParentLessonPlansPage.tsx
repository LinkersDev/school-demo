import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  BookMarked,
  Calculator,
  FileDown,
  FlaskConical,
  Languages,
  Loader2,
  FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { formatDate } from '../../../utils/format'
import {
  downloadLessonPlanDocx,
  downloadLessonPlanPdf,
  type LessonPlanExportSource,
} from '../../../utils/lessonPlanExport'
import ChildSelector from '../components/ChildSelector'
import { useParentChildContext } from '../hooks/useParentChildContext'
import type { LessonPlan } from '../../lessonPlans/lessonPlanShared'
import {
  fetchAllLessonPlansForParent,
  isLessonPlanVisibleToParent,
  lessonPlanStatusProgress,
  ProgressBar,
  subjectIdFromPlan,
} from '../../lessonPlans/lessonPlanShared'
import SubjectPill from '../../lessonPlans/components/SubjectPill'

const SUBJECT_ICON_RULES: [RegExp, LucideIcon][] = [
  [/math|mathematics/i, Calculator],
  [/english|ela|language arts|reading/i, BookOpen],
  [/science/i, FlaskConical],
  [/arabic|french|spanish|german|mandarin|language/i, Languages],
]

function subjectLeadingIcon(name: string): LucideIcon {
  for (const [re, Icon] of SUBJECT_ICON_RULES) {
    if (re.test(name)) return Icon
  }
  return BookMarked
}

function weekLabel(plan: LessonPlan): string {
  if (!plan.week_start) return '—'
  const start = formatDate(plan.week_start)
  if (plan.week_end) return `${start} – ${formatDate(plan.week_end)}`
  return start
}

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

function parseSubjectSelection(raw: string | null): 'all' | number {
  if (raw == null || raw === '' || raw === 'all') return 'all'
  const n = Number(raw)
  if (!Number.isFinite(n)) return 'all'
  return n
}

export default function ParentLessonPlansPage() {
  const { children, activeId, setStudentId, isLoading, hasChildren } = useParentChildContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewPlan, setViewPlan] = useState<LessonPlan | null>(null)
  const [exportingId, setExportingId] = useState<number | null>(null)
  const [exportKind, setExportKind] = useState<'pdf' | 'docx' | null>(null)

  const activeChild = useMemo(() => children.find((c) => c.id === activeId), [children, activeId])
  const activeClassId = activeChild?.class_id ?? null
  const classDisplayName = activeChild?.class?.trim() || '—'

  const { data: mergedPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['lesson-plans', 'for-parent'],
    queryFn: fetchAllLessonPlansForParent,
    enabled: hasChildren,
  })

  const approvedForActiveClass = useMemo(() => {
    if (activeClassId == null) return []
    return mergedPlans.filter(
      (p) => Number(p.assigned_class) === activeClassId && isLessonPlanVisibleToParent(p.status),
    )
  }, [mergedPlans, activeClassId])

  const subjectChoices = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of approvedForActiveClass) {
      const sid = Number(subjectIdFromPlan(p))
      if (!Number.isFinite(sid)) continue
      const name = p.subject_detail?.name ?? 'Subject'
      if (!map.has(sid)) map.set(sid, name)
    }
    return [...map.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }),
    )
  }, [approvedForActiveClass])

  const subjectParam = searchParams.get('subject')
  const selectedSubject = useMemo(() => parseSubjectSelection(subjectParam), [subjectParam])

  useEffect(() => {
    if (searchParams.get('class')) {
      const next = new URLSearchParams(searchParams)
      next.delete('class')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (activeClassId == null || selectedSubject === 'all') return
    if (!subjectChoices.some(([id]) => id === selectedSubject)) {
      const next = new URLSearchParams(searchParams)
      next.delete('subject')
      setSearchParams(next, { replace: true })
    }
  }, [activeClassId, selectedSubject, subjectChoices, searchParams, setSearchParams])

  const displayPlans = useMemo(() => {
    if (selectedSubject === 'all') return approvedForActiveClass
    return approvedForActiveClass.filter((p) => Number(subjectIdFromPlan(p)) === selectedSubject)
  }, [approvedForActiveClass, selectedSubject])

  const setSubjectFilter = (value: 'all' | number) => {
    const next = new URLSearchParams(searchParams)
    if (activeId != null) next.set('student', String(activeId))
    if (value === 'all') next.delete('subject')
    else next.set('subject', String(value))
    setSearchParams(next, { replace: true })
  }

  const runExport = async (row: LessonPlan, kind: 'pdf' | 'docx') => {
    setExportingId(row.id)
    setExportKind(kind)
    try {
      const payload = toExportSource(row)
      if (kind === 'pdf') {
        downloadLessonPlanPdf(payload)
      } else {
        await downloadLessonPlanDocx(payload)
      }
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingId(null)
      setExportKind(null)
    }
  }

  if (isLoading && !hasChildren) {
    return <div className="py-20 text-center text-gray-400">Loading…</div>
  }

  if (!hasChildren) {
    return (
      <div className="py-20 text-center text-gray-500">No children linked to your account yet.</div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BookMarked className="h-7 w-7 shrink-0 text-indigo-600" />
          Lesson Plans
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          School-approved lesson plans for your child&apos;s class (coordinator or admin approved) · read-only
        </p>
      </div>

      <ChildSelector activeId={activeId} children={children} onSelect={setStudentId} />

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-gray-900">Your Child&apos;s Class: </span>
          <span className="text-gray-900">{classDisplayName}</span>
        </p>
        {activeChild?.name ? (
          <p className="mt-1 text-sm text-gray-500">{activeChild.name}</p>
        ) : null}
      </div>

      {plansLoading ? (
        <p className="py-16 text-center text-sm text-gray-500">Loading lesson plans...</p>
      ) : subjectChoices.length === 0 ? (
        <p className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
          No lesson plans available yet for this class.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Subject</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SubjectPill
                label="All Subjects"
                size="touch"
                selected={selectedSubject === 'all'}
                onClick={() => setSubjectFilter('all')}
              />
              {subjectChoices.map(([id, name]) => {
                const Icon = subjectLeadingIcon(name)
                return (
                  <SubjectPill
                    key={id}
                    label={name}
                    size="touch"
                    selected={selectedSubject === id}
                    onClick={() => setSubjectFilter(id)}
                    leading={<Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />}
                  />
                )
              })}
            </div>
          </div>

          {displayPlans.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 py-14 text-center text-sm text-gray-600">
              No lesson plans available for this subject
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:gap-4">
              {displayPlans.map((plan) => (
                <li key={plan.id}>
                  <button
                    type="button"
                    onClick={() => setViewPlan(plan)}
                    className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md active:scale-[0.99] sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <FileText className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900">{plan.title}</div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div>
                            <span className="text-gray-500">Subject:</span>{' '}
                            {plan.subject_detail?.name ?? '—'}
                          </div>
                          <div>
                            <span className="text-gray-500">Teacher:</span>{' '}
                            {plan.teacher_name?.trim() || '—'}
                          </div>
                          <div>
                            <span className="text-gray-500">Week:</span> {weekLabel(plan)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Modal open={!!viewPlan} onClose={() => setViewPlan(null)} title={viewPlan?.title ?? ''} size="2xl">
        {viewPlan ? (
          <div className="flex max-h-[min(78vh,40rem)] flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <div className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="text-sm text-gray-700">
                  {[viewPlan.class_detail?.name ?? '—', viewPlan.subject_detail?.name ?? '—'].join(' · ')}
                  <br />
                  <span className="text-gray-500">Teacher:</span> {viewPlan.teacher_name || '—'}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={exportingId === viewPlan.id}
                    onClick={() => void runExport(viewPlan, 'pdf')}
                  >
                    {exportingId === viewPlan.id && exportKind === 'pdf' ? (
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
                    disabled={exportingId === viewPlan.id}
                    onClick={() => void runExport(viewPlan, 'docx')}
                  >
                    {exportingId === viewPlan.id && exportKind === 'docx' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
                    Word
                  </Button>
                </div>
              </div>
              {(() => {
                const { pct, label } = lessonPlanStatusProgress(viewPlan.status)
                return (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-700">Status</div>
                    <div className="text-xs text-gray-600">{label}</div>
                    <ProgressBar pct={pct} />
                  </div>
                )
              })()}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">Objectives</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {(viewPlan.objectives || '').trim() || '—'}
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">Activities</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {(viewPlan.activities || '').trim() || '—'}
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">Materials</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {(viewPlan.materials || '').trim() || '—'}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
