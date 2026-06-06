import { useMemo, useState, useRef, useEffect, useDeferredValue } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Pencil, ChevronDown, ChevronUp, Users, BarChart3, Table2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'
import { Card, CardBody } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Table } from '../../../components/ui/Table'
import { Modal } from '../../../components/ui/Modal'
import { useAcademicFilter } from '../context/AcademicFilterContext'
import { academicFilterSearch } from '../utils/academicFilterQuery'
import {
  displayTitle,
  normalizeAssessmentRow,
  formatStudentScoreCell,
} from '../utils/academicGradesDisplay'
import ScoreSheetsTab, {
  type AssessmentColumn,
  type MatrixData,
  parseScoreCell,
} from '../../grades/components/ScoreSheetsTab'
import { GradeStatusBadge } from '../../grades/components/GradeStatusBadge'
import { cn } from '../../../utils/cn'

function countRecordedForAssessment(at: AssessmentColumn, studentIds: number[]): number {
  const numeric = (at.scoring_mode ?? 'numeric') === 'numeric'
  let n = 0
  for (const sid of studentIds) {
    const cell = parseScoreCell(at.scores[String(sid)])
    if (numeric) {
      if (cell.score != null && cell.score !== '') n++
    } else if (cell.functional_rating) n++
  }
  return n
}

const HERO_COUNT = 6

interface MatrixStudentRow {
  id: number
  first_name: string
  last_name: string
  student_id: string
}

export default function AcademicGradesDashboardPage() {
  const { hasScope, user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'
  const canManage = hasScope('grades.manage')
  const canApprove = hasScope('scores.approve')
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { classId, subjectId, grade } = useAcademicFilter()
  const [searchParams, setSearchParams] = useSearchParams()

  const [studentQuery, setStudentQuery] = useState('')
  const deferredStudentQuery = useDeferredValue(studentQuery)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [showAllAssessments, setShowAllAssessments] = useState(false)
  const [entryTrigger, setEntryTrigger] = useState<{ assessmentId: number; key: number } | null>(null)
  const [viewAssessment, setViewAssessment] = useState<AssessmentColumn | null>(null)

  const [importCsv, setImportCsv] = useState('')
  const [bulkAssessmentId, setBulkAssessmentId] = useState('')
  const [copySource, setCopySource] = useState('')
  const [copyTarget, setCopyTarget] = useState('')
  const bulkRef = useRef<HTMLDivElement>(null)
  const filterQs = academicFilterSearch(grade, classId, subjectId)

  const ready = Boolean(classId && subjectId)

  const { data: matrixData, isFetching } = useQuery<MatrixData>({
    queryKey: ['score-matrix', classId, subjectId],
    queryFn: () =>
      api
        .get('/score-sheets/matrix/', { params: { assigned_class: classId, subject: subjectId } })
        .then(r => r.data),
    enabled: ready,
  })

  const { data: pendingSheets } = useQuery({
    queryKey: ['score-sheets', 'dashboard-pending'],
    queryFn: () =>
      api.get('/score-sheets/', { params: { status: 'submitted' } }).then(r => r.data.results ?? r.data),
    enabled: canApprove,
  })
  const pendingCount = Array.isArray(pendingSheets) ? pendingSheets.length : 0

  const assessments = useMemo(() => {
    if (!matrixData?.assessments) return []
    return [...matrixData.assessments].map(normalizeAssessmentRow).sort((a, b) => {
      if (a.term !== b.term) return a.term.localeCompare(b.term)
      return a.order - b.order
    })
  }, [matrixData])

  const studentIds = useMemo(() => (matrixData?.students ?? []).map(s => s.id), [matrixData])

  const cardAssessments = showAllAssessments ? assessments : assessments.slice(0, HERO_COUNT)

  const summary = useMemo(() => {
    if (!matrixData) return null
    const total = matrixData.students.length
    let withAny = 0
    for (const sid of studentIds) {
      let any = false
      for (const at of assessments) {
        const c = parseScoreCell(at.scores[String(sid)])
        if ((at.scoring_mode ?? 'numeric') === 'numeric') {
          if (c.score != null && c.score !== '') any = true
        } else if (c.functional_rating) any = true
        if (any) break
      }
      if (any) withAny++
    }
    return { total, withAny }
  }, [matrixData, studentIds, assessments])

  const filteredStudents = useMemo(() => {
    if (!matrixData?.students) return []
    const q = deferredStudentQuery.trim().toLowerCase()
    if (!q) return matrixData.students
    return matrixData.students.filter(s => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase()
      const code = (s.student_id ?? '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }, [matrixData, deferredStudentQuery])

  useEffect(() => {
    const edit = searchParams.get('editAssessment')
    if (!edit || !ready) return
    const id = Number(edit)
    if (!Number.isFinite(id)) return
    setEntryTrigger({ assessmentId: id, key: Date.now() })
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      p.delete('editAssessment')
      return p
    }, { replace: true })
  }, [ready, searchParams, setSearchParams])

  const { data: typesList } = useQuery({
    queryKey: ['assessment-types', 'dash-bulk'],
    queryFn: () =>
      api.get('/assessment-types/', { params: { page_size: 200 } }).then(r => r.data.results ?? r.data),
    enabled: canManage && ready,
  })
  const typeRows = (typesList as { id: number; name: string; term: string }[] | undefined) ?? []

  const bulkImport = useMutation({
    mutationFn: () =>
      api.post('/score-sheets/bulk-import-csv/', {
        assigned_class: Number(classId),
        subject: Number(subjectId),
        assessment_type: Number(bulkAssessmentId),
        csv: importCsv,
      }),
    onSuccess: () => {
      toast.success('Import saved to draft sheet')
      qc.invalidateQueries({ queryKey: ['score-sheets'] })
      qc.invalidateQueries({ queryKey: ['score-matrix', classId, subjectId] })
      setImportCsv('')
    },
    onError: () => toast.error('Import failed'),
  })

  const bulkApproveAll = useMutation({
    mutationFn: () =>
      api.post('/score-sheets/bulk-approve-context/', {
        assigned_class: Number(classId),
        subject: Number(subjectId),
      }),
    onSuccess: res => {
      toast.success(res.data?.detail ?? 'All sheets approved')
      qc.invalidateQueries({ queryKey: ['score-matrix', classId, subjectId] })
      qc.invalidateQueries({ queryKey: ['score-sheets'] })
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? 'Bulk approve failed')
    },
  })

  const copyScores = useMutation({
    mutationFn: () =>
      api.post('/score-sheets/copy-assessment-scores/', {
        assigned_class: Number(classId),
        subject: Number(subjectId),
        source_assessment_type: Number(copySource),
        target_assessment_type: Number(copyTarget),
      }),
    onSuccess: () => {
      toast.success('Scores copied')
      qc.invalidateQueries({ queryKey: ['score-matrix', classId, subjectId] })
    },
    onError: () => toast.error('Copy failed'),
  })

  const downloadTemplate = async (assessmentTypeId: string) => {
    if (!classId || !subjectId || !assessmentTypeId) {
      toast.error('Select class, subject, and assessment')
      return
    }
    try {
      const res = await api.get('/score-sheets/bulk-template/', {
        params: {
          assigned_class: classId,
          subject: subjectId,
          assessment_type: assessmentTypeId,
        },
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'grade_import_template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  const studentTableColumns = selectedStudentId
    ? [
        {
          header: 'Assessment',
          render: (at: AssessmentColumn) => (
            <span className="font-medium text-gray-900">{displayTitle(at)}</span>
          ),
        },
        {
          header: 'Score',
          render: (at: AssessmentColumn) => (
            <span className="font-mono text-sm">{formatStudentScoreCell(at, selectedStudentId)}</span>
          ),
        },
        {
          header: 'Status',
          render: (at: AssessmentColumn) => {
            const st = at.sheet?.status
            if (!st) return <span className="text-xs text-gray-400">No sheet</span>
            return <GradeStatusBadge status={st} />
          },
        },
      ]
    : []

  const assessmentViewColumns = useMemo(() => {
    if (!viewAssessment) return []
    const at = viewAssessment
    return [
      {
        header: 'Student',
        render: (s: MatrixStudentRow) => (
          <span className="font-medium text-gray-900">
            {s.first_name} {s.last_name}
          </span>
        ),
      },
      {
        header: 'Student ID',
        render: (s: MatrixStudentRow) => <span className="font-mono text-xs text-gray-700">{s.student_id}</span>,
      },
      {
        header: 'Score',
        render: (s: MatrixStudentRow) => (
          <span className="font-mono text-sm">{formatStudentScoreCell(at, s.id)}</span>
        ),
      },
      {
        header: 'Status',
        render: () =>
          at.sheet ? (
            <GradeStatusBadge status={at.sheet.status} />
          ) : (
            <span className="text-xs text-gray-400">No sheet</span>
          ),
      },
    ]
  }, [viewAssessment])

  const selectedStudent = matrixData?.students.find(s => s.id === selectedStudentId)

  return (
    <div className="space-y-6">
      {canApprove && (
        <Card className="border-amber-200 bg-amber-50/80">
          <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-900">
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>
                <strong>{pendingCount}</strong> score sheet(s) pending approval
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {!ready && (
        <Card>
          <CardBody className="py-10 text-center text-sm text-gray-500">
            {grade ? (
              <>
                Select a <strong className="text-gray-800">class</strong> and <strong className="text-gray-800">subject</strong>{' '}
                in the filter bar to load the grades dashboard.
              </>
            ) : (
              <>
                Choose a <strong className="text-gray-800">grade level</strong> first, then pick a class and subject to see
                assessments and statistics.
              </>
            )}
          </CardBody>
        </Card>
      )}

      {ready && (
        <>
          {!isAdmin && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between gap-y-4">
              <div className="min-w-0 flex-1 max-w-xl">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-800">
                  Find student
                </label>
                <input
                  type="search"
                  value={studentQuery}
                  onChange={e => setStudentQuery(e.target.value)}
                  placeholder="Search by name or student ID…"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  disabled={!matrixData}
                  autoComplete="off"
                />
                {studentQuery !== deferredStudentQuery && matrixData ? (
                  <p className="mt-1 text-xs text-gray-400">Searching…</p>
                ) : null}
                {matrixData && filteredStudents.length > 0 && (
                  <ul className="mt-2 max-h-52 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    {filteredStudents.slice(0, 50).map(s => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(s.id)}
                          className={cn(
                            'flex w-full flex-col items-stretch gap-0.5 px-3 py-2.5 text-left text-sm transition sm:flex-row sm:items-center sm:justify-between',
                            'hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400/40',
                            selectedStudentId === s.id &&
                              'bg-blue-100 font-semibold text-blue-950 ring-2 ring-blue-400/50 ring-inset',
                          )}
                        >
                          <span className="text-gray-900">
                            {s.first_name} {s.last_name}
                          </span>
                          <span className="font-mono text-xs text-gray-600 sm:text-right">ID: {s.student_id}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {matrixData && studentQuery.trim() && filteredStudents.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500">No students match this search.</p>
                ) : null}
              </div>
            </div>
          )}

          {summary && matrixData && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-gray-800">
                <span className="inline-flex items-center gap-2 font-medium text-blue-900">
                  <Users className="h-4 w-4 shrink-0 text-blue-700" />
                  {summary.total} students in class
                </span>
                <span className="text-gray-700">
                  <strong className="font-semibold text-gray-900">{summary.withAny}</strong> with at least one grade
                  recorded
                </span>
                <span className="text-gray-600">
                  {matrixData.class.name} · {matrixData.subject.name}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/academics/class-results${filterQs}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  <Table2 className="h-4 w-4" />
                  View all student grades
                </Link>
                {canApprove && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                    loading={bulkApproveAll.isPending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Approve every score sheet for this class and subject? (Draft, submitted, and rejected become approved.)',
                        )
                      )
                        return
                      bulkApproveAll.mutate()
                    }}
                  >
                    Approve all sheets
                  </Button>
                )}
              </div>
            </div>
          )}

          {isFetching && (
            <p className="text-sm text-gray-500">Loading assessment data…</p>
          )}

          {matrixData && (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Assessments</h2>
                {assessments.length > HERO_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllAssessments(s => !s)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {showAllAssessments ? (
                      <>
                        Show fewer <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Show all ({assessments.length}) <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cardAssessments.map(at => {
                  const recorded = countRecordedForAssessment(at, studentIds)
                  const canEditSheet =
                    canManage && (!at.sheet || at.sheet.status === 'draft' || at.sheet.status === 'rejected')

                  const termTint =
                    at.term === 'TERM_1'
                      ? 'border-t-4 border-t-blue-500 bg-gradient-to-b from-blue-50/50 to-white'
                      : 'border-t-4 border-t-violet-500 bg-gradient-to-b from-violet-50/50 to-white'

                  return (
                    <Card
                      key={at.id}
                      className={cn('overflow-hidden shadow-sm transition hover:shadow-md', termTint)}
                    >
                      <CardBody className="flex flex-col gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 leading-snug">{displayTitle(at)}</h3>
                          <p className="text-xs text-gray-500">
                            {(at.scoring_mode ?? 'numeric') === 'functional'
                              ? 'Functional / skills-based'
                              : `Out of ${Math.round(Number(at.max_score))}`}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {at.sheet ? (
                            <GradeStatusBadge status={at.sheet.status} />
                          ) : (
                            <span className="text-xs text-gray-400">No score sheet yet</span>
                          )}
                        </div>

                        <p className="text-sm text-gray-800">
                          <span className="text-gray-500">Students with a recorded grade:</span>{' '}
                          <strong className="font-semibold text-gray-900">{recorded}</strong>
                        </p>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="border-gray-200 text-gray-800 hover:bg-gray-50"
                            onClick={() => setViewAssessment(at)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View grades
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                size="sm"
                                className="shadow-sm"
                                disabled={!canEditSheet}
                                onClick={() => setEntryTrigger({ assessmentId: at.id, key: Date.now() })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit grades
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="border-blue-200 text-blue-800 hover:bg-blue-50"
                                onClick={() => {
                                  setBulkAssessmentId(String(at.id))
                                  if (isTeacher) {
                                    const p = new URLSearchParams()
                                    if (grade) p.set('grade', grade)
                                    if (classId) p.set('class', classId)
                                    if (subjectId) p.set('subject', subjectId)
                                    p.set('assessment', String(at.id))
                                    navigate(`/academics/teacher-upload?${p.toString()}`)
                                  } else {
                                    bulkRef.current?.scrollIntoView({ behavior: 'smooth' })
                                  }
                                }}
                              >
                                <Upload className="h-3.5 w-3.5" />
                                Upload CSV
                              </Button>
                            </>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {viewAssessment && matrixData && (
            <Modal
              open
              onClose={() => setViewAssessment(null)}
              title={displayTitle(viewAssessment)}
              size="2xl"
            >
              <p className="mb-3 text-xs text-gray-500">
                {(viewAssessment.scoring_mode ?? 'numeric') === 'functional'
                  ? 'Skills-based assessment'
                  : `Out of ${Math.round(Number(viewAssessment.max_score))}`}{' '}
                · {matrixData.subject.name} · {matrixData.class.name}
              </p>
              <Table<MatrixStudentRow>
                columns={assessmentViewColumns}
                data={matrixData.students as MatrixStudentRow[]}
                emptyMessage="No students in class"
                wrapperClassName="max-h-[min(60vh,28rem)] overflow-y-auto"
              />
            </Modal>
          )}

          {!isAdmin && selectedStudentId && selectedStudent && assessments.length > 0 && (
            <Card
              className={cn(
                'border-2 shadow-md transition-colors',
                'border-blue-400 bg-gradient-to-b from-blue-50/80 to-white ring-1 ring-blue-100',
              )}
            >
              <CardBody>
                <div className="mb-4 flex flex-col gap-1 border-b border-blue-100/80 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-blue-950">
                      Grades for {selectedStudent.first_name} {selectedStudent.last_name}
                    </h3>
                    <p className="text-xs font-medium text-blue-900/80">
                      Student ID: <span className="font-mono">{selectedStudent.student_id}</span>
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">
                    All assessments for {matrixData?.subject.name} (configured terms)
                  </p>
                </div>
                <div className="min-w-0 overflow-x-auto rounded-lg border border-gray-100 bg-white">
                  <Table columns={studentTableColumns} data={assessments} emptyMessage="No assessments" />
                </div>
              </CardBody>
            </Card>
          )}

          {canManage && ready && !isTeacher && (
            <div ref={bulkRef}>
              <Card className="border-blue-100/80">
                <CardBody className="space-y-3 py-3">
                  <details className="group rounded-lg border border-gray-200 bg-gray-50/50">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-100/80 [&::-webkit-details-marker]:hidden">
                      <span className="inline-flex w-full items-center justify-between gap-2">
                        <span>Bulk actions — CSV upload &amp; copy scores</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 transition group-open:rotate-180" />
                      </span>
                    </summary>
                    <div className="space-y-4 border-t border-gray-200 px-3 pb-4 pt-3">
                  <p className="text-xs text-gray-500">
                    Template download, paste CSV, or copy scores between assessments for this class and subject.
                  </p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                      <label className="text-xs font-medium text-gray-600">Assessment for import</label>
                      <select
                        value={bulkAssessmentId}
                        onChange={e => setBulkAssessmentId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option value="">— Select —</option>
                        {typeRows.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.term})
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          disabled={!bulkAssessmentId}
                          onClick={() => downloadTemplate(bulkAssessmentId)}
                        >
                          Download template
                        </Button>
                      </div>
                      <textarea
                        value={importCsv}
                        onChange={e => setImportCsv(e.target.value)}
                        rows={5}
                        placeholder="Paste CSV…"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                      />
                      <Button
                        size="sm"
                        loading={bulkImport.isPending}
                        disabled={!bulkAssessmentId || !importCsv.trim()}
                        onClick={() => bulkImport.mutate()}
                      >
                        Upload &amp; save to draft
                      </Button>
                    </div>
                    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                      <label className="text-xs font-medium text-gray-600">Copy scores</label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select
                          value={copySource}
                          onChange={e => setCopySource(e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Source</option>
                          {typeRows.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={copyTarget}
                          onChange={e => setCopyTarget(e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Target</option>
                          {typeRows.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={copyScores.isPending}
                        disabled={!copySource || !copyTarget || copySource === copyTarget}
                        onClick={() => copyScores.mutate()}
                      >
                        Copy scores
                      </Button>
                    </div>
                  </div>
                    </div>
                  </details>
                </CardBody>
              </Card>
            </div>
          )}

          {canManage && (
            <p className="text-center text-sm">
              <a href="/assessment-types" className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                Assessment settings
              </a>
              <span className="mx-2 text-gray-300">·</span>
              <a href="/grading-legacy" className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                Legacy exams &amp; matrix
              </a>
            </p>
          )}
        </>
      )}

      {ready && (
        <ScoreSheetsTab
          dashboardCompanion={{
            classId,
            subjectId,
            openEntryTrigger: entryTrigger,
            onEntryModalClose: () => setEntryTrigger(null),
          }}
        />
      )}
    </div>
  )
}
