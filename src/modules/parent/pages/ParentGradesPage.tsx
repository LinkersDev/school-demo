import { BarChart2 } from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { formatDate } from '../../../utils/format'
import ChildSelector from '../components/ChildSelector'
import { useParentChildContext } from '../hooks/useParentChildContext'
import type { ParentGradeRow } from '../services/parentPortal.service'

function pctColor(p: number): string {
  if (p >= 75) return 'text-green-600'
  if (p >= 50) return 'text-yellow-600'
  return 'text-red-500'
}

function functionalLabel(rating: string | null | undefined): string {
  if (!rating) return '—'
  const map: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Good',
    needs_improvement: 'Needs improvement',
  }
  return map[rating] ?? rating
}

function gradeRowSummary(g: ParentGradeRow): string {
  if (g.scoring_mode === 'functional' || g.functional_rating) {
    return functionalLabel(g.functional_rating)
  }
  if (g.score != null && g.max_score != null) {
    return `${g.score}/${g.max_score}`
  }
  return '—'
}

export default function ParentGradesPage() {
  const { children, activeId, setStudentId, detail, isLoading, hasChildren } = useParentChildContext()

  if (isLoading && !detail) {
    return <div className="text-center py-20 text-gray-400">Loading grades…</div>
  }

  if (!hasChildren) {
    return (
      <div className="text-center py-20 text-gray-500">
        No children linked to your account yet.
      </div>
    )
  }

  const bySubject = detail?.grades_by_subject ?? {}
  const subjects = Object.keys(bySubject).sort()

  const numericWithPct = (detail?.grades ?? []).filter(
    g => g.percentage != null && typeof g.percentage === 'number',
  )
  const avg =
    numericWithPct.length > 0
      ? Math.round(numericWithPct.reduce((acc, g) => acc + (g.percentage ?? 0), 0) / numericWithPct.length)
      : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 className="w-7 h-7 text-blue-600" />
          Grades
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Assessment results for {detail?.child.name ?? '…'}
          {detail?.grades_source === 'structured_only' && (
            <span className="ml-2 text-xs text-gray-400">(approved structured assessments)</span>
          )}
        </p>
      </div>

      <ChildSelector children={children} activeId={activeId} onSelect={setStudentId} />

      {detail && (
        <>
          {avg != null && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-700">
                Overall average (numeric assessments with scores only)
              </span>
              <span className="text-2xl font-bold text-blue-700">{avg}%</span>
            </div>
          )}

          {subjects.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-sm text-gray-400">No grades recorded yet.</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-5">
              {subjects.map(subject => (
                <Card key={subject}>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900">{subject}</h3>
                  </CardHeader>
                  <div className="divide-y divide-gray-50">
                    {bySubject[subject].map(g => (
                      <div
                        key={String(g.id)}
                        className="px-6 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                      >
                        <div>
                          <div className="font-medium text-gray-800">{g.exam}</div>
                          <div className="text-xs text-gray-400">
                            {g.term ? `${g.term} · ` : ''}
                            {g.date ? formatDate(g.date) : '—'} · {gradeRowSummary(g)}
                            {g.source === 'structured' && (
                              <span className="ml-1 text-[10px] uppercase text-green-600">approved</span>
                            )}
                          </div>
                        </div>
                        {g.percentage != null ? (
                          <div className={`text-lg font-bold ${pctColor(g.percentage)}`}>{g.percentage}%</div>
                        ) : g.functional_rating ? (
                          <div className="text-base font-semibold text-purple-700">
                            {functionalLabel(g.functional_rating)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">—</div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
