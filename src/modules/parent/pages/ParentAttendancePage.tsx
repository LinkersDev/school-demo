import { ClipboardList } from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/Badge'
import { formatDate } from '../../../utils/format'
import ChildSelector from '../components/ChildSelector'
import { useParentChildContext } from '../hooks/useParentChildContext'

function StatPill({ label, value, tone }: { label: string; value: number; tone: 'green' | 'red' | 'amber' | 'gray' }) {
  const bg = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    red: 'bg-red-50 text-red-800 border-red-100',
    amber: 'bg-amber-50 text-amber-900 border-amber-100',
    gray: 'bg-gray-50 text-gray-800 border-gray-100',
  }[tone]
  return (
    <div className={`rounded-xl border px-4 py-3 ${bg}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

export default function ParentAttendancePage() {
  const { children, activeId, setStudentId, detail, isLoading, hasChildren } = useParentChildContext()

  if (isLoading && !detail) {
    return <div className="text-center py-20 text-gray-400">Loading attendance…</div>
  }

  if (!hasChildren) {
    return (
      <div className="text-center py-20 text-gray-500">
        No children linked to your account yet.
      </div>
    )
  }

  const s = detail?.attendance_summary
  const rate =
    s && s.total > 0 ? Math.round((s.present / s.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-blue-600" />
          Attendance
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Records for your child · {detail?.child.name ?? '…'}
        </p>
      </div>

      <ChildSelector children={children} activeId={activeId} onSelect={setStudentId} />

      {detail && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill label="Present" value={s?.present ?? 0} tone="green" />
            <StatPill label="Absent" value={s?.absent ?? 0} tone="red" />
            <StatPill label="Late" value={s?.late ?? 0} tone="amber" />
            <StatPill label="Days recorded" value={s?.total ?? 0} tone="gray" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-gray-600">Attendance rate (recorded days)</span>
            <span className="text-lg font-bold text-blue-600">{rate}%</span>
          </div>

          <Card>
            <CardHeader>
              <h3 className="font-semibold">History</h3>
             <p className="text-xs text-gray-400 font-normal">Newest first · up to one year</p>
            </CardHeader>
            <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
              {detail.attendance.length === 0 ? (
                <CardBody>
                  <p className="text-sm text-gray-400">No attendance records yet.</p>
                </CardBody>
              ) : (
                detail.attendance.map((row, idx) => (
                  <div key={`${row.date}-${idx}`} className="px-6 py-3 flex justify-between items-start gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">{formatDate(row.date)}</span>
                      {row.notes ? (
                        <p className="text-xs text-gray-400 mt-1">{row.notes}</p>
                      ) : null}
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
