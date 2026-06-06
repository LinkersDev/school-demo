import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Table } from '../../../components/ui/Table'
import { Input } from '../../../components/ui/Input'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'

interface TermRow {
  id: number
  name: string
  order: number
  academic_year: number
}

interface SubjectRow {
  id: number
  name: string
  code: string
}

interface SubjectExamRow {
  id: number
  exam_type: string
  max_score: string
}

interface StudentGradeRow {
  id: number
  score: string | null
  percentage: number | null
  student_detail: { id: number; first_name: string; last_name: string }
  subject_exam: number
}

function unwrapResults<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: T[] }).results)) {
    return (data as { results: T[] }).results
  }
  return []
}

const EXAM_LABEL: Record<string, string> = {
  assessment: 'Assessment',
  midterm: 'Midterm',
  final: 'Final',
}

const EXAM_ORDER = ['assessment', 'midterm', 'final']

export default function GradingExplorerPage() {
  const { hasScope } = useAuth()
  const qc = useQueryClient()
  const canManage = hasScope('grades.manage')
  const [termId, setTermId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [subjectExamId, setSubjectExamId] = useState<number | null>(null)
  const [draftScores, setDraftScores] = useState<Record<number, string>>({})

  const { data: termsRaw } = useQuery({
    queryKey: ['terms', { activeYear: true }],
    queryFn: () =>
      api
        .get<TermRow[]>('/terms/', { params: { academic_year__is_active: true, ordering: 'order' } })
        .then((r) => unwrapResults<TermRow>(r.data)),
  })

  const terms = termsRaw ?? []

  useEffect(() => {
    if (terms.length && termId === null) {
      setTermId(terms[0].id)
    }
  }, [terms, termId])

  const { data: subjectsRaw } = useQuery({
    queryKey: ['subjects', 'global-catalog'],
    queryFn: () =>
      api
        .get<SubjectRow[]>('/subjects/', { params: { assigned_class__isnull: true } })
        .then((r) => unwrapResults<SubjectRow>(r.data)),
  })

  const catalogSubjects = useMemo(() => {
    const list = subjectsRaw ?? []
    const want = new Set(['MATH', 'ENG', 'SCI'])
    const picked = list.filter((s) => want.has(s.code))
    return picked.length ? picked : list.slice(0, 6)
  }, [subjectsRaw])

  const { data: subjectExams = [] } = useQuery({
    queryKey: ['subject-exams', subjectId, termId],
    enabled: Boolean(subjectId && termId),
    queryFn: () =>
      api
        .get<SubjectExamRow[]>('/subject-exams/', { params: { subject: subjectId, term: termId } })
        .then((r) => unwrapResults<SubjectExamRow>(r.data)),
  })

  const sortedExams = useMemo(() => {
    const orderIdx = (t: string) => {
      const i = EXAM_ORDER.indexOf(t)
      return i === -1 ? 99 : i
    }
    return [...subjectExams].sort((a, b) => orderIdx(a.exam_type) - orderIdx(b.exam_type))
  }, [subjectExams])

  useEffect(() => {
    if (sortedExams.length && !sortedExams.some((e) => e.id === subjectExamId)) {
      setSubjectExamId(sortedExams[0].id)
    }
  }, [sortedExams, subjectExamId])

  const { data: gradeRows = [], isLoading: gradesLoading } = useQuery({
    queryKey: ['structured-grades', subjectExamId],
    enabled: Boolean(subjectExamId),
    queryFn: () =>
      api
        .get<StudentGradeRow[]>('/structured-grades/', { params: { subject_exam: subjectExamId } })
        .then((r) => unwrapResults<StudentGradeRow>(r.data)),
  })

  const patchGrade = useMutation({
    mutationFn: ({ id, score }: { id: number; score: string | null }) =>
      api.patch(`/structured-grades/${id}/`, { score: score === '' ? null : score }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['structured-grades', subjectExamId] })
      toast.success('Grade saved')
    },
    onError: () => toast.error('Could not save grade'),
  })

  return (
    <div className="min-w-0 space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Grading explorer</h1>
        <p className="mt-0.5 break-words text-sm text-gray-500">
          Structured catalog: terms, subjects (from <code className="rounded bg-gray-100 px-1 text-xs">/api/subjects/</code>), exams,
          and student scores.
        </p>
      </div>

      <div className="-mx-1 overflow-x-auto border-b border-gray-200">
        <div className="flex min-w-0 flex-nowrap gap-1 px-1 pb-px sm:flex-wrap">
          {terms.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTermId(t.id)
                setSubjectExamId(null)
              }}
              className={`shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                termId === t.id
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Subjects</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {catalogSubjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSubjectId(s.id)
                setSubjectExamId(null)
              }}
            >
              <Card
                className={`p-4 text-left h-full transition ring-2 ${
                  subjectId === s.id ? 'ring-blue-500 bg-blue-50/50' : 'ring-transparent hover:ring-gray-200'
                }`}
              >
                <div className="font-semibold text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-500 mt-1">{s.code}</div>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {subjectId && termId ? (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Exams</h2>
          <div className="flex flex-wrap gap-2">
            {sortedExams.map((ex) => (
              <Button
                key={ex.id}
                variant={subjectExamId === ex.id ? 'primary' : 'secondary'}
                onClick={() => setSubjectExamId(ex.id)}
                className="text-sm"
              >
                {EXAM_LABEL[ex.exam_type] ?? ex.exam_type}
              </Button>
            ))}
          </div>
          {!sortedExams.length && (
            <p className="text-sm text-amber-600 mt-2">
              No subject exams for this subject and term. Add exams under Grades or Assessment Settings.
            </p>
          )}
        </div>
      ) : null}

      {subjectExamId ? (
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Grades</h2>
          <div className="min-w-0 overflow-x-auto">
          <Table<StudentGradeRow>
            loading={gradesLoading}
            data={gradeRows}
            emptyMessage="No grades for this exam."
            columns={[
              {
                header: 'Student',
                render: (row) => (
                  <span>
                    {row.student_detail.first_name} {row.student_detail.last_name}
                  </span>
                ),
              },
              {
                header: 'Score',
                render: (row) => {
                  if (!canManage) {
                    return <span>{row.score ?? '—'}</span>
                  }
                  const val = draftScores[row.id] ?? (row.score !== null && row.score !== undefined ? String(row.score) : '')
                  return (
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-24 py-1"
                        type="number"
                        step="0.01"
                        value={val}
                        onChange={(e) => setDraftScores((d) => ({ ...d, [row.id]: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs py-1"
                        onClick={() =>
                          patchGrade.mutate({
                            id: row.id,
                            score: (draftScores[row.id] ?? val) === '' ? null : (draftScores[row.id] ?? val),
                          })
                        }
                      >
                        Save
                      </Button>
                    </div>
                  )
                },
              },
              {
                header: '%',
                render: (row) => <span>{row.percentage != null ? `${row.percentage}%` : '—'}</span>,
              },
            ]}
          />
          </div>
        </div>
      ) : null}
    </div>
  )
}
