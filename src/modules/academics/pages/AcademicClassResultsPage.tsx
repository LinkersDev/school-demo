import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Table2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'
import { Button } from '../../../components/ui/Button'
import { useAcademicFilter } from '../context/AcademicFilterContext'
import { academicFilterSearch } from '../utils/academicFilterQuery'
import {
  displayTitle,
  normalizeAssessmentRow,
  formatStudentScoreCell,
} from '../utils/academicGradesDisplay'
import type { MatrixData } from '../../grades/components/ScoreSheetsTab'
import { GradeStatusBadge } from '../../grades/components/GradeStatusBadge'

export default function AcademicClassResultsPage() {
  const { hasScope } = useAuth()
  const canApprove = hasScope('scores.approve')
  const qc = useQueryClient()
  const { classId, subjectId, grade } = useAcademicFilter()
  const ready = Boolean(classId && subjectId)
  const filterQs = academicFilterSearch(grade, classId, subjectId)

  const { data: matrixData, isFetching } = useQuery<MatrixData>({
    queryKey: ['score-matrix', classId, subjectId],
    queryFn: () =>
      api
        .get('/score-sheets/matrix/', { params: { assigned_class: classId, subject: subjectId } })
        .then(r => r.data),
    enabled: ready,
  })

  const assessments = useMemo(() => {
    if (!matrixData?.assessments) return []
    return [...matrixData.assessments].map(normalizeAssessmentRow).sort((a, b) => {
      if (a.term !== b.term) return a.term.localeCompare(b.term)
      return a.order - b.order
    })
  }, [matrixData])

  const bulkApprove = useMutation({
    mutationFn: () =>
      api.post('/score-sheets/bulk-approve-context/', {
        assigned_class: Number(classId),
        subject: Number(subjectId),
      }),
    onSuccess: res => {
      toast.success(res.data?.detail ?? 'Sheets approved')
      qc.invalidateQueries({ queryKey: ['score-matrix', classId, subjectId] })
      qc.invalidateQueries({ queryKey: ['score-sheets'] })
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? 'Bulk approve failed')
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/academics/dashboard${filterQs}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
        {canApprove && ready && (
          <Button
            size="sm"
            variant="secondary"
            className="border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
            loading={bulkApprove.isPending}
            disabled={!matrixData}
            onClick={() => {
              if (
                !window.confirm(
                  'Approve every score sheet for this class and subject? This sets draft, submitted, and rejected sheets to approved.',
                )
              )
                return
              bulkApprove.mutate()
            }}
          >
            Approve all sheets (this class & subject)
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-gray-900">
        <Table2 className="h-5 w-5 text-blue-600" />
        <h1 className="text-lg font-semibold">All student grades</h1>
      </div>
      <p className="text-sm text-gray-600">
        Full matrix for the grade, class, and subject selected in the filter bar above. Use the same filters as on the
        dashboard.
      </p>

      {!ready && (
        <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          Select a <strong>class</strong> and <strong>subject</strong> in the filters to load results.
        </p>
      )}

      {isFetching && ready && <p className="text-sm text-gray-500">Loading…</p>}

      {ready && matrixData && assessments.length > 0 && (
        <div className="min-w-0 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-gray-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
                >
                  Student
                </th>
                <th
                  scope="col"
                  className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 sm:static sm:border-r-0"
                >
                  ID
                </th>
                {assessments.map(at => (
                  <th
                    key={at.id}
                    scope="col"
                    className="min-w-[8.5rem] px-2 py-3 text-left align-bottom"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-900 leading-tight">
                        {displayTitle(at)}
                      </span>
                      <span className="text-[10px] font-normal text-gray-500">
                        {(at.scoring_mode ?? 'numeric') === 'functional'
                          ? 'Skills'
                          : `Out of ${Math.round(Number(at.max_score))}`}
                      </span>
                      {at.sheet ? (
                        <GradeStatusBadge status={at.sheet.status} />
                      ) : (
                        <span className="text-[10px] text-gray-400">No sheet</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {matrixData.students.map(st => (
                <tr key={st.id} className="group hover:bg-blue-50/40">
                  <td className="sticky left-0 z-[1] whitespace-nowrap bg-white px-3 py-2 font-medium text-gray-900 group-hover:bg-blue-50/40">
                    {st.first_name} {st.last_name}
                  </td>
                  <td className="sticky left-0 z-[1] whitespace-nowrap border-r border-gray-100 bg-white px-3 py-2 font-mono text-xs text-gray-600 group-hover:bg-blue-50/40 sm:static sm:border-r-0">
                    {st.student_id}
                  </td>
                  {assessments.map(at => (
                    <td key={at.id} className="px-2 py-2 text-center sm:text-left">
                      <span className="font-mono text-xs text-gray-900">
                        {formatStudentScoreCell(at, st.id)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ready && matrixData && assessments.length === 0 && (
        <p className="text-sm text-gray-500">No assessments match this class grade band.</p>
      )}
    </div>
  )
}
