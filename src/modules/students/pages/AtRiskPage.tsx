import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Search, Users, Filter } from 'lucide-react'
import api from '../../../services/api'

// ── Types ─────────────────────────────────────────────────────────────────────
type RiskReason = 'ABSENCE' | 'LOW_GRADES' | 'NO_GRADES'

interface AtRiskStudent {
  id: number
  name: string
  student_id: string
  class: string | null
  grade_level: string | null
  risk_reasons: RiskReason[]
}

interface AtRiskResponse {
  count: number
  breakdown: { absence: number; low_grades: number; no_grades: number }
  results: AtRiskStudent[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const REASON_META: Record<RiskReason, { label: string; color: string }> = {
  ABSENCE:    { label: 'Absence Issues', color: 'bg-orange-100 text-orange-700' },
  LOW_GRADES: { label: 'Low Grades',     color: 'bg-red-100 text-red-700'       },
  NO_GRADES:  { label: 'No Grades',      color: 'bg-yellow-100 text-yellow-700' },
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '',          label: 'All Reasons'    },
  { value: 'ABSENCE',   label: 'Absence Issues' },
  { value: 'LOW_GRADES',label: 'Low Grades'     },
  { value: 'NO_GRADES', label: 'No Grades'      },
]

function severityLevel(reasons: RiskReason[]) {
  if (reasons.length >= 2) return 'high'
  if (reasons.includes('ABSENCE') || reasons.includes('LOW_GRADES')) return 'medium'
  return 'low'
}

const SEVERITY_STYLE = {
  high:   'border-l-4 border-red-400 bg-red-50/30',
  medium: 'border-l-4 border-orange-400 bg-orange-50/20',
  low:    'border-l-4 border-yellow-300 bg-yellow-50/10',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AtRiskPage() {
  const navigate = useNavigate()
  const [search, setSearch]           = useState('')
  const [reasonFilter, setReasonFilter] = useState('')

  const { data, isLoading } = useQuery<AtRiskResponse>({
    queryKey: ['students-at-risk'],
    queryFn: () => api.get('/students/at-risk/').then(r => r.data),
  })

  const allStudents = data?.results ?? []
  const breakdown   = data?.breakdown ?? { absence: 0, low_grades: 0, no_grades: 0 }

  // Client-side filter (backend also filters, but this gives instant feedback)
  const filtered = allStudents.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.student_id.includes(search)
    const matchReason = !reasonFilter || s.risk_reasons.includes(reasonFilter as RiskReason)
    return matchSearch && matchReason
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            At-Risk Students
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Students flagged for absence issues, low grades, or missing assessments
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total At-Risk</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{data?.count ?? 0}</p>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
          <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Absence Issues</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{breakdown.absence}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Low Grades</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{breakdown.low_grades}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-4">
          <p className="text-xs text-yellow-600 font-medium uppercase tracking-wide">No Grades</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{breakdown.no_grades}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or student ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white appearance-none cursor-pointer"
          >
            {FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-gray-400 text-sm">Loading at-risk students…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search || reasonFilter ? 'No students match your filters' : 'No at-risk students — great news!'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Student</div>
              <div className="col-span-3">Class</div>
              <div className="col-span-4">Risk Reasons</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
              {filtered.map((s, idx) => {
                const severity = severityLevel(s.risk_reasons)
                return (
                  <div
                    key={s.id}
                    className={`grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-gray-50/70 transition ${SEVERITY_STYLE[severity]}`}
                  >
                    <div className="col-span-1 text-sm text-gray-400 font-mono">{idx + 1}</div>

                    <div className="col-span-4">
                      <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.student_id}</p>
                    </div>

                    <div className="col-span-3">
                      {s.class ? (
                        <span className="text-sm text-gray-600">{s.class}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Unassigned</span>
                      )}
                    </div>

                    <div className="col-span-4 flex flex-wrap gap-1.5">
                      {s.risk_reasons.map(r => (
                        <span
                          key={r}
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${REASON_META[r].color}`}
                        >
                          {REASON_META[r].label}
                        </span>
                      ))}
                      {severity === 'high' && (
                        <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800">
                          Severe
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              Showing {filtered.length} of {data?.count ?? 0} at-risk students
            </div>
          </>
        )}
      </div>
    </div>
  )
}
