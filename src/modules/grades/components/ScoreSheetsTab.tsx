import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Save, ClipboardCheck, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Table } from '../../../components/ui/Table'
import { Modal } from '../../../components/ui/Modal'
import { formatDate } from '../../../utils/format'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'
import { cn } from '../../../utils/cn'
import { GradeStatusBadge } from './GradeStatusBadge'

export interface MatrixScoreCell {
  score: string | null
  functional_rating: string | null
}

export interface SheetSummary {
  id: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  entered_by: string | null
  approved_by: string | null
  rejection_note: string
  submitted_at: string | null
  approved_at: string | null
}

export interface AssessmentColumn {
  id: number
  name: string
  term: 'TERM_1' | 'TERM_2'
  order: number
  max_score: string
  scoring_mode?: 'numeric' | 'functional'
  sheet: SheetSummary | null
  scores: Record<string, MatrixScoreCell>
}

export interface MatrixStudent {
  id: number
  first_name: string
  last_name: string
  student_id: string
}

export interface MatrixData {
  class: { id: number; name: string; grade_level: string }
  subject: { id: number; name: string }
  students: MatrixStudent[]
  assessments: AssessmentColumn[]
}

export interface SheetRecord {
  id: number
  assigned_class: number
  class_detail: { id: number; name: string }
  subject: number
  subject_detail: { id: number; name: string }
  assessment_type: number
  assessment_type_detail: { id: number; name: string; term: string }
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  score_count: number
  entered_by_name: string
  submitted_at: string | null
  approved_at: string | null
  rejection_note: string
  scores?: Array<{
    id: number
    student: number
    student_detail: { id: number; full_name: string; student_id: string }
    score: string | null
    functional_rating: string | null
  }>
}

export function parseScoreCell(raw: unknown): MatrixScoreCell {
  if (raw == null) return { score: null, functional_rating: null }
  if (typeof raw === 'object' && raw !== null && 'score' in raw) {
    const o = raw as { score?: string | null; functional_rating?: string | null }
    return {
      score: o.score != null ? String(o.score) : null,
      functional_rating: o.functional_rating ?? null,
    }
  }
  return { score: String(raw), functional_rating: null }
}

const FUNCTIONAL_OPTIONS = [
  { value: '', label: '—' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'needs_improvement', label: 'Needs improvement' },
]

export function functionalLabel(v: string | null): string {
  if (!v) return '—'
  const f = FUNCTIONAL_OPTIONS.find(o => o.value === v)
  return f?.label ?? v
}

export interface DashboardCompanionConfig {
  classId: string
  subjectId: string
  /** Increment key when opening edit for same assessment again */
  openEntryTrigger: { assessmentId: number; key: number } | null
  onEntryModalClose?: () => void
}

export interface ScoreSheetsTabProps {
  hubClassId?: string
  hubSubjectId?: string
  autoLoadMatrix?: boolean
  /** When set: load matrix for class/subject and render only modals (no matrix chrome) */
  dashboardCompanion?: DashboardCompanionConfig | null
}

function normalizeAssessmentColumn(a: AssessmentColumn): AssessmentColumn {
  return {
    ...a,
    scoring_mode: a.scoring_mode === 'functional' ? 'functional' : 'numeric',
    scores: Object.fromEntries(Object.entries(a.scores ?? {}).map(([k, v]) => [k, parseScoreCell(v)])),
  }
}

export default function ScoreSheetsTab({
  hubClassId,
  hubSubjectId,
  autoLoadMatrix,
  dashboardCompanion,
}: ScoreSheetsTabProps) {
  const { hasScope } = useAuth()
  const qc = useQueryClient()
  const canManage = hasScope('grades.manage')
  const canApprove = hasScope('scores.approve')

  const [sheetsSubTab, setSheetsSubTab] = useState<'entry' | 'approval'>(
    canApprove ? 'approval' : 'entry',
  )
  const [entryClass, setEntryClass] = useState('')
  const [entrySubject, setEntrySubject] = useState('')
  const [matrixLoaded, setMatrixLoaded] = useState(false)
  const [entryModal, setEntryModal] = useState<AssessmentColumn | null>(null)
  const [approvalFilter, setApprovalFilter] = useState('submitted')
  const [viewSheet, setViewSheet] = useState<SheetRecord | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    if (dashboardCompanion) {
      setEntryClass(dashboardCompanion.classId)
      setEntrySubject(dashboardCompanion.subjectId)
      setMatrixLoaded(true)
      return
    }
    if (!autoLoadMatrix || !hubClassId || !hubSubjectId) return
    setEntryClass(hubClassId)
    setEntrySubject(hubSubjectId)
    setMatrixLoaded(true)
  }, [autoLoadMatrix, hubClassId, hubSubjectId, dashboardCompanion])

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes/').then(r => r.data.results ?? r.data),
  })

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects/').then(r => r.data.results ?? r.data),
  })

  const { data: matrixData, isFetching: matrixFetching, refetch: refetchMatrix } = useQuery<MatrixData>({
    queryKey: ['score-matrix', entryClass, entrySubject],
    queryFn: () =>
      api
        .get('/score-sheets/matrix/', { params: { assigned_class: entryClass, subject: entrySubject } })
        .then(r => r.data),
    enabled: !!entryClass && !!entrySubject && matrixLoaded,
  })

  useEffect(() => {
    if (!dashboardCompanion?.openEntryTrigger || !matrixData) return
    const { assessmentId } = dashboardCompanion.openEntryTrigger
    const raw = matrixData.assessments.find(a => a.id === assessmentId)
    if (raw) setEntryModal(normalizeAssessmentColumn(raw))
  }, [dashboardCompanion?.openEntryTrigger?.key, matrixData, dashboardCompanion?.openEntryTrigger?.assessmentId])

  const { data: sheetsData, isLoading: sheetsLoading } = useQuery({
    queryKey: ['score-sheets', approvalFilter],
    queryFn: () =>
      api
        .get('/score-sheets/', { params: { ...(approvalFilter && { status: approvalFilter }) } })
        .then(r => r.data.results ?? r.data),
    enabled: sheetsSubTab === 'approval' && !dashboardCompanion,
  })

  const sheetList: SheetRecord[] = sheetsData ?? []

  const { data: sheetDetail } = useQuery<SheetRecord>({
    queryKey: ['score-sheet-detail', viewSheet?.id],
    queryFn: () => api.get(`/score-sheets/${viewSheet!.id}/`).then(r => r.data),
    enabled: !!viewSheet?.id,
  })

  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/score-sheets/${id}/approve/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['score-sheets'] })
      qc.invalidateQueries({ queryKey: ['score-sheet-detail', viewSheet?.id] })
      toast.success('Score sheet approved')
      setViewSheet(null)
    },
    onError: () => toast.error('Failed to approve'),
  })

  const reject = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      api.post(`/score-sheets/${id}/reject/`, { note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['score-sheets'] })
      qc.invalidateQueries({ queryKey: ['score-sheet-detail', viewSheet?.id] })
      toast.success('Score sheet rejected')
      setViewSheet(null)
      setShowRejectModal(false)
      setRejectNote('')
    },
    onError: () => toast.error('Failed to reject'),
  })

  const assessmentsByTerm = useMemo(() => {
    if (!matrixData) return { TERM_1: [] as AssessmentColumn[], TERM_2: [] as AssessmentColumn[] }
    const groups: Record<string, AssessmentColumn[]> = { TERM_1: [], TERM_2: [] }
    for (const a of matrixData.assessments) {
      const col: AssessmentColumn = {
        ...a,
        scoring_mode: a.scoring_mode === 'functional' ? 'functional' : 'numeric',
        scores: Object.fromEntries(Object.entries(a.scores ?? {}).map(([k, v]) => [k, parseScoreCell(v)])),
      }
      if (groups[a.term]) groups[a.term].push(col)
    }
    return groups
  }, [matrixData])

  const loadMatrix = () => {
    if (!entryClass || !entrySubject) {
      toast.error('Select both class and subject')
      return
    }
    setMatrixLoaded(true)
    void refetchMatrix()
  }

  const approvalColumns = [
    {
      header: 'Class',
      render: (s: SheetRecord) => <span className="font-medium">{s.class_detail?.name}</span>,
    },
    {
      header: 'Subject',
      render: (s: SheetRecord) => <span className="text-blue-600 text-sm font-medium">{s.subject_detail?.name}</span>,
    },
    {
      header: 'Assessment',
      render: (s: SheetRecord) => (
        <div>
          <div className="text-sm font-medium">{s.assessment_type_detail?.name}</div>
          <div className="text-xs text-gray-400 capitalize">
            {s.assessment_type_detail?.term?.replace('_', ' ').toLowerCase()}
          </div>
        </div>
      ),
    },
    { header: 'Status', render: (s: SheetRecord) => <GradeStatusBadge status={s.status} /> },
    { header: 'Teacher', render: (s: SheetRecord) => <span className="text-sm text-gray-600">{s.entered_by_name}</span> },
    { header: 'Students', render: (s: SheetRecord) => <span className="text-sm font-mono">{s.score_count}</span> },
    {
      header: 'Submitted',
      render: (s: SheetRecord) =>
        s.submitted_at ? (
          <span className="text-xs text-gray-500">{formatDate(s.submitted_at.split('T')[0])}</span>
        ) : (
          '—'
        ),
    },
    {
      header: 'Actions',
      render: (s: SheetRecord) => (
        <Button variant="secondary" size="sm" onClick={() => setViewSheet(s)}>
          View
        </Button>
      ),
    },
  ]

  const closeEntryModal = () => {
    setEntryModal(null)
    dashboardCompanion?.onEntryModalClose?.()
  }

  const companionModals = (
    <>
      {entryModal && matrixData && (
        <ScoreEntryModal
          assessment={entryModal}
          classId={Number(entryClass)}
          subjectId={Number(entrySubject)}
          students={matrixData.students}
          onClose={closeEntryModal}
          onSaved={() => {
            closeEntryModal()
            void refetchMatrix()
          }}
        />
      )}

      {viewSheet && (
        <Modal open onClose={() => setViewSheet(null)} title="Score Sheet Review" size="lg">
          {sheetDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
                <div>
                  <span className="text-gray-500">Class:</span> <strong>{sheetDetail.class_detail?.name}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Subject:</span> <strong>{sheetDetail.subject_detail?.name}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Assessment:</span>{' '}
                  <strong>{sheetDetail.assessment_type_detail?.name}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Teacher:</span> <strong>{sheetDetail.entered_by_name}</strong>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-gray-500">Status:</span>
                  <GradeStatusBadge status={sheetDetail.status} />
                  {sheetDetail.rejection_note && (
                    <span className="text-xs text-red-600 italic ml-2">&quot;{sheetDetail.rejection_note}&quot;</span>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {(sheetDetail.scores ?? []).map(sc => (
                  <div key={sc.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-800">{sc.student_detail?.full_name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-mono">{sc.student_detail?.student_id}</span>
                      <span
                        className={cn(
                          'font-mono font-bold text-sm',
                          sc.score != null || sc.functional_rating ? 'text-gray-900' : 'text-gray-300',
                        )}
                      >
                        {sc.functional_rating
                          ? functionalLabel(sc.functional_rating)
                          : sc.score != null
                            ? sc.score
                            : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {sheetDetail.status === 'submitted' && canApprove && (
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                  <Button variant="secondary" onClick={() => setShowRejectModal(true)}>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <Button onClick={() => approve.mutate(sheetDetail.id)} loading={approve.isPending}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">Loading...</div>
          )}
        </Modal>
      )}

      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Score Sheet" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Optionally provide a reason. The teacher will see this note.</p>
          <textarea
            value={rejectNote}
            onChange={e => setRejectNote(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={reject.isPending}
              onClick={() => viewSheet && reject.mutate({ id: viewSheet.id, note: rejectNote })}
            >
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )

  if (dashboardCompanion) {
    return companionModals
  }

  return (
    <div className="space-y-5">
      <div className="max-w-full overflow-x-auto rounded-lg bg-gray-100 p-1">
        <div className="flex w-fit min-w-0 gap-1">
          <button
            type="button"
            onClick={() => setSheetsSubTab('entry')}
            className={cn(
              'shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition',
              sheetsSubTab === 'entry' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Grade Entry
          </button>
          {canApprove && (
            <button
              type="button"
              onClick={() => setSheetsSubTab('approval')}
              className={cn(
                'shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition',
                sheetsSubTab === 'approval' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              Approval Queue
            </button>
          )}
        </div>
      </div>

      {sheetsSubTab === 'entry' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 sm:min-w-[10rem]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
                <select
                  value={entryClass}
                  onChange={e => {
                    setEntryClass(e.target.value)
                    setMatrixLoaded(false)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">— Select class —</option>
                  {(classes ?? []).map((c: { id: number; name: string }) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 flex-1 sm:min-w-[10rem]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                <select
                  value={entrySubject}
                  onChange={e => {
                    setEntrySubject(e.target.value)
                    setMatrixLoaded(false)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">— Select subject —</option>
                  {(subjects ?? []).map((s: { id: number; name: string }) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button className="min-h-[44px] w-full sm:w-auto" onClick={loadMatrix} loading={matrixFetching} variant="secondary">
                Load Matrix
              </Button>
            </div>
          </Card>

          {matrixLoaded && matrixData && (
            <ScoreMatrix
              data={matrixData}
              assessmentsByTerm={assessmentsByTerm}
              canManage={canManage}
              onEnterScores={at => setEntryModal(at)}
              onRefresh={() => void refetchMatrix()}
            />
          )}

          {matrixLoaded && !matrixData && !matrixFetching && (
            <Card>
              <div className="py-12 text-center text-gray-400 text-sm">
                No data found. Make sure the class and subject exist.
              </div>
            </Card>
          )}
        </div>
      )}

      {sheetsSubTab === 'approval' && canApprove && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <select
              value={approvalFilter}
              onChange={e => setApprovalFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
            >
              <option value="submitted">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All Status</option>
            </select>
            <span className="text-sm text-gray-400">{sheetList.length} result(s)</span>
          </div>
          <Card>
            <div className="min-w-0 overflow-x-auto">
              <Table
                columns={approvalColumns}
                data={sheetList}
                loading={sheetsLoading}
                emptyMessage="No score sheets match the filter"
              />
            </div>
          </Card>
        </div>
      )}

      {companionModals}
    </div>
  )
}

function ScoreMatrix({
  data,
  assessmentsByTerm,
  canManage,
  onEnterScores,
  onRefresh,
}: {
  data: MatrixData
  assessmentsByTerm: Record<string, AssessmentColumn[]>
  canManage: boolean
  onEnterScores: (at: AssessmentColumn) => void
  onRefresh: () => void
}) {
  const allAssessments = [...(assessmentsByTerm.TERM_1 ?? []), ...(assessmentsByTerm.TERM_2 ?? [])]

  const getTotal = (student: MatrixStudent) => {
    let total = 0
    let count = 0
    for (const at of allAssessments) {
      if ((at.scoring_mode ?? 'numeric') === 'functional') continue
      const cell = parseScoreCell(at.scores[String(student.id)])
      const raw = cell.score
      if (raw !== null && raw !== undefined && raw !== '') {
        total += Number(raw)
        count++
      }
    }
    return count > 0 ? total : null
  }

  return (
    <Card>
      <div className="flex flex-col gap-2 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">
            {data.class.name} — {data.subject.name}
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            {data.students.length} students · {allAssessments.length} assessments
          </p>
        </div>
        <button type="button" onClick={onRefresh} className="shrink-0 self-start text-xs text-blue-600 hover:underline sm:self-auto">
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 min-w-48 sticky left-0 bg-gray-50 z-10">
                Student
              </th>
              {(['TERM_1', 'TERM_2'] as const).map(term => {
                const count = (assessmentsByTerm[term] ?? []).length
                if (count === 0) return null
                return (
                  <th
                    key={term}
                    colSpan={count}
                    className={cn(
                      'text-center px-2 py-2 text-xs font-semibold border-l border-gray-200',
                      term === 'TERM_1' ? 'text-blue-700 bg-blue-50' : 'text-purple-700 bg-purple-50',
                    )}
                  >
                    {term === 'TERM_1' ? 'Term 1' : 'Term 2'}
                  </th>
                )
              })}
              <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 border-l border-gray-200">Total</th>
            </tr>

            <tr className="border-b border-gray-200">
              <th className="sticky left-0 bg-white z-10 px-4 py-2" />
              {allAssessments.map(at => {
                const st = at.sheet?.status
                const canEdit = !st || st === 'draft' || st === 'rejected'
                return (
                  <th key={at.id} className="px-2 py-2 text-center border-l border-gray-100 min-w-24">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-700 leading-tight">{at.name}</span>
                      <span className="text-[10px] text-gray-400 uppercase">{(at.scoring_mode ?? 'numeric') === 'functional' ? 'skills' : `/${at.max_score}`}</span>
                      {st ? <GradeStatusBadge status={st} /> : <span className="text-xs text-gray-300 italic">—</span>}
                      {canManage && canEdit && (
                        <button
                          type="button"
                          onClick={() => onEnterScores(at)}
                          className="mt-0.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {st === 'rejected' ? 'Re-enter' : 'Enter'}
                        </button>
                      )}
                      {canManage && st === 'draft' && at.sheet && (
                        <SubmitSheetButton sheetId={at.sheet.id} onSuccess={onRefresh} />
                      )}
                    </div>
                  </th>
                )
              })}
              <th className="px-3 py-2 border-l border-gray-200" />
            </tr>
          </thead>

          <tbody>
            {data.students.map((student, idx) => {
              const total = getTotal(student)
              return (
                <tr
                  key={student.id}
                  className={cn('border-b border-gray-50 hover:bg-gray-50', idx % 2 === 0 ? '' : 'bg-gray-50/50')}
                >
                  <td className="sticky left-0 bg-inherit z-10 px-4 py-2.5">
                    <div className="font-medium text-gray-900 text-sm">
                      {student.first_name} {student.last_name}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">{student.student_id}</div>
                  </td>
                  {allAssessments.map(at => {
                    const cell = parseScoreCell(at.scores[String(student.id)])
                    const approved = at.sheet?.status === 'approved'
                    const display =
                      (at.scoring_mode ?? 'numeric') === 'functional'
                        ? functionalLabel(cell.functional_rating)
                        : cell.score != null && cell.score !== ''
                          ? cell.score
                          : null
                    return (
                      <td key={at.id} className="px-2 py-2.5 text-center border-l border-gray-50">
                        {display != null ? (
                          <span
                            className={cn(
                              'font-semibold text-sm',
                              (at.scoring_mode ?? 'numeric') === 'functional' ? 'text-purple-800' : 'font-mono',
                              approved ? 'text-green-700' : 'text-gray-800',
                            )}
                          >
                            {display}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-center border-l border-gray-200">
                    {total !== null ? (
                      <span className="font-bold text-sm text-indigo-700">{total}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function SubmitSheetButton({ sheetId, onSuccess }: { sheetId: number; onSuccess: () => void }) {
  const qc = useQueryClient()
  const submit = useMutation({
    mutationFn: () => api.post(`/score-sheets/${sheetId}/submit/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['score-sheets'] })
      toast.success('Submitted for approval')
      onSuccess()
    },
    onError: () => toast.error('Failed to submit'),
  })

  return (
    <button
      type="button"
      onClick={() => submit.mutate()}
      disabled={submit.isPending}
      className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-0.5"
      title="Submit for approval"
    >
      <Send className="w-3 h-3" />
      Submit
    </button>
  )
}

function ScoreEntryModal({
  assessment,
  classId,
  subjectId,
  students,
  onClose,
  onSaved,
}: {
  assessment: AssessmentColumn
  classId: number
  subjectId: number
  students: MatrixStudent[]
  onClose: () => void
  onSaved: () => void
}) {
  const isFunctional = (assessment.scoring_mode ?? 'numeric') === 'functional'

  const [numericScores, setNumericScores] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    for (const s of students) {
      const cell = parseScoreCell(assessment.scores[String(s.id)])
      if (cell.score != null && cell.score !== '') init[s.id] = String(cell.score)
    }
    return init
  })

  const [functionalScores, setFunctionalScores] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    for (const s of students) {
      const cell = parseScoreCell(assessment.scores[String(s.id)])
      if (cell.functional_rating) init[s.id] = cell.functional_rating
    }
    return init
  })

  const isApproved = assessment.sheet?.status === 'approved'

  const buildPayload = () =>
    students.map(s => {
      if (isFunctional) {
        const fr = functionalScores[s.id]
        return {
          student: s.id,
          functional_rating: fr && fr !== '' ? fr : null,
          score: null,
        }
      }
      const v = numericScores[s.id]
      return {
        student: s.id,
        score: v !== undefined && v !== '' ? Number(v) : null,
        functional_rating: null,
      }
    })

  const saveDraft = useMutation({
    mutationFn: () =>
      api.post('/score-sheets/save/', {
        assigned_class: classId,
        subject: subjectId,
        assessment_type: assessment.id,
        scores: buildPayload(),
      }),
    onSuccess: () => {
      toast.success('Draft saved')
      onSaved()
    },
    onError: () => toast.error('Failed to save'),
  })

  const submitSheet = useMutation({
    mutationFn: async () => {
      const saveRes = await api.post('/score-sheets/save/', {
        assigned_class: classId,
        subject: subjectId,
        assessment_type: assessment.id,
        scores: buildPayload(),
      })
      const sheetId = saveRes.data.id as number
      return api.post(`/score-sheets/${sheetId}/submit/`)
    },
    onSuccess: () => {
      toast.success('Submitted for approval')
      onSaved()
    },
    onError: () => toast.error('Failed to submit'),
  })

  const filledCount = isFunctional
    ? Object.values(functionalScores).filter(v => v !== '' && v != null).length
    : Object.values(numericScores).filter(v => v !== '').length
  const maxScore = Number(assessment.max_score)

  return (
    <Modal open onClose={onClose} title={`Enter Scores: ${assessment.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 bg-gray-50 rounded-xl px-4 py-2.5 text-sm">
          <span className="text-gray-500">
            Term: <strong>{assessment.term === 'TERM_1' ? 'Term 1' : 'Term 2'}</strong>
          </span>
          <span>·</span>
          <span className="text-gray-500">
            Mode: <strong>{isFunctional ? 'Functional' : `Numeric (max ${maxScore})`}</strong>
          </span>
          {assessment.sheet && (
            <>
              <span>·</span>
              <GradeStatusBadge status={assessment.sheet.status} />
            </>
          )}
          {assessment.sheet?.rejection_note && (
            <span className="text-xs text-red-600 italic">&quot;{assessment.sheet.rejection_note}&quot;</span>
          )}
        </div>

        {isApproved && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800">
            This assessment has been approved and is read-only.
          </div>
        )}

        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {students.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-1">
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  {s.first_name} {s.last_name}
                </span>
                <span className="text-xs text-gray-400 ml-2 font-mono">({s.student_id})</span>
              </div>
              {isFunctional ? (
                <select
                  disabled={isApproved}
                  value={functionalScores[s.id] ?? ''}
                  onChange={e => setFunctionalScores(p => ({ ...p, [s.id]: e.target.value }))}
                  className={cn(
                    'min-w-[11rem] px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none',
                    isApproved ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300',
                  )}
                >
                  {FUNCTIONAL_OPTIONS.map(o => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={0}
                  max={maxScore}
                  disabled={isApproved}
                  value={numericScores[s.id] ?? ''}
                  onChange={e => setNumericScores(p => ({ ...p, [s.id]: e.target.value }))}
                  className={cn(
                    'w-24 px-2 py-1.5 border rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none',
                    isApproved ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {filledCount} of {students.length} filled
          </span>
          {!isApproved && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => saveDraft.mutate()}
                loading={saveDraft.isPending}
                disabled={submitSheet.isPending}
              >
                <Save className="w-3.5 h-3.5 mr-1" /> Save Draft
              </Button>
              <Button
                onClick={() => submitSheet.mutate()}
                loading={submitSheet.isPending}
                disabled={saveDraft.isPending || filledCount === 0}
              >
                <ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Submit
              </Button>
            </div>
          )}
          {isApproved && (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
