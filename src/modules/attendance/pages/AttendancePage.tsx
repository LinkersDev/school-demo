import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, Clock3, Users, XCircle } from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Input'
import { Badge, StatusBadge } from '../../../components/ui/Badge'
import { Table } from '../../../components/ui/Table'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'
import { cn } from '../../../utils/cn'

interface AttendanceRecord {
  id: number
  student: number
  student_detail: { id: number; first_name: string; last_name: string }
  date: string
  status: string
}

interface StudentRow {
  id: number
  full_name: string
  student_id: string
}

interface AttendanceSummaryRow {
  student__id: number
  student__first_name: string
  student__last_name: string
  total: number
  present: number
  absent: number
  late: number
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', active: 'bg-emerald-600 text-white border-emerald-600', idle: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  { value: 'absent', label: 'Absent', active: 'bg-red-600 text-white border-red-600', idle: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
  { value: 'late', label: 'Late', active: 'bg-amber-500 text-white border-amber-500', idle: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
] as const

const filterShell =
  'rounded-2xl border border-indigo-100/50 bg-white/40 px-4 py-4 shadow-sm backdrop-blur-md sm:px-5 sm:py-5'

const fieldSelect =
  'border-indigo-200/65 bg-white/85 text-indigo-950 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/25'

export default function AttendancePage() {
  const { hasScope } = useAuth()
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(today)
  const [bulkStatuses, setBulkStatuses] = useState<Record<number, string>>({})
  const canManage = hasScope('attendance.manage')

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes/').then(r => r.data.results ?? r.data),
  })

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['students-by-class', selectedClass],
    queryFn: () => api.get('/students/', { params: { assigned_class: selectedClass } }).then(r => r.data),
    enabled: !!selectedClass,
  })

  const { data: existingAttendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', selectedClass, selectedDate],
    queryFn: () => api.get('/attendance/', { params: { assigned_class: selectedClass, date: selectedDate } }).then(r => r.data),
    enabled: !!(selectedClass && selectedDate),
  })

  const { data: attendanceSummary } = useQuery({
    queryKey: ['attendance-report-class', selectedClass],
    queryFn: () => api.get('/attendance/report/', { params: { class_id: selectedClass } }).then(r => r.data),
    enabled: !!selectedClass,
  })

  useEffect(() => {
    setBulkStatuses({})
  }, [selectedClass, selectedDate])

  const studentList: StudentRow[] = students?.results ?? students ?? []
  const existingAttendanceList: AttendanceRecord[] = existingAttendance?.results ?? existingAttendance ?? []
  const existingMap = Object.fromEntries(existingAttendanceList.map((a) => [a.student, a.status]))
  const reportRows: AttendanceSummaryRow[] = Array.isArray(attendanceSummary) ? attendanceSummary : []
  const frequentAbsenceIds = new Set(reportRows.filter((row) => row.absent >= 3).map((row) => row.student__id))
  const isTableLoading = studentsLoading || attendanceLoading

  const getStatus = (studentId: number) => bulkStatuses[studentId] ?? existingMap[studentId] ?? 'present'

  const summary = useMemo(() => {
    return studentList.reduce(
      (acc, student) => {
        const status = getStatus(student.id)
        if (status === 'absent') acc.absent += 1
        else if (status === 'late') acc.late += 1
        else acc.present += 1
        return acc
      },
      { present: 0, absent: 0, late: 0 }
    )
  }, [studentList, bulkStatuses, existingMap])

  const setStatus = (studentId: number, status: string) => {
    setBulkStatuses((prev) => ({ ...prev, [studentId]: status }))
  }

  const markAll = (status: 'present' | 'absent' | 'late') => {
    const next = Object.fromEntries(studentList.map((student) => [student.id, status]))
    setBulkStatuses(next)
  }

  const bulkMark = useMutation({
    mutationFn: () => api.post('/attendance/bulk-mark/', {
      assigned_class: Number(selectedClass),
      date: selectedDate,
      records: studentList.map((s: { id: number }) => ({ student: s.id, status: getStatus(s.id) })),
    }),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['attendance-report-class', selectedClass] })
      qc.invalidateQueries({ queryKey: ['attendance-report-overview'] })
      qc.invalidateQueries({ queryKey: ['dashboard-admin'] })
      toast.success('Attendance saved')
      if (response?.data?.detail) {
        toast.success(response.data.detail)
      }
      setBulkStatuses({})
    },
    onError: () => toast.error('Failed to save attendance'),
  })

  const columns = [
    {
      header: 'Student',
      render: (s: StudentRow) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{s.full_name}</div>
            {frequentAbsenceIds.has(s.id) && (
              <Badge color="orange">Frequent absence</Badge>
            )}
          </div>
          <div className="text-xs text-gray-400">{s.student_id}</div>
        </div>
      ),
    },
    {
      header: 'Attendance Status',
      className: 'w-[360px]',
      render: (s: StudentRow) => (
        canManage ? (
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => {
              const active = getStatus(s.id) === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(s.id, option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
                    active ? option.active : option.idle
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        ) : (
          <StatusBadge status={getStatus(s.id)} />
        )
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
      </div>

      <Card className="border-indigo-100/50 bg-white/90 shadow-indigo-900/5">
        <CardHeader className="border-indigo-100/40 bg-transparent">
          <div className={filterShell}>
            <div className="space-y-4">
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-0 flex-1 sm:min-w-[12rem]">
                  <Select
                    label="Class"
                    labelClassName="text-indigo-900/80"
                    className={fieldSelect}
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">-- Select Class --</option>
                    {(classes ?? []).map((c: { id: number; name: string }) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="min-w-0 flex-1 sm:min-w-[10rem]">
                  <label className="mb-1 block text-sm font-medium text-indigo-900/80">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm outline-none transition',
                      fieldSelect,
                    )}
                  />
                </div>
                {canManage && selectedClass && (
                  <div className="sm:shrink-0">
                    <Button
                      className="min-h-[44px] w-full sm:w-auto"
                      onClick={() => bulkMark.mutate()}
                      loading={bulkMark.isPending}
                      disabled={studentList.length === 0}
                    >
                      Save Attendance
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-indigo-800/70">
                  Students load automatically once you select a class and date.
                </p>
                {selectedClass && (
                  <span className="text-indigo-500/80">
                    {studentList.length} student{studentList.length !== 1 ? 's' : ''} in class
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        {selectedClass ? (
          <CardBody className="space-y-5 overflow-x-auto">
            {existingAttendanceList.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Attendance already recorded for this class and date.
                  </p>
                  <p className="text-sm text-amber-700">
                    You can review and edit the statuses below, then save again.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <SummaryCard title="Present" value={summary.present} icon={CheckCircle2} color="emerald" />
              <SummaryCard title="Absent" value={summary.absent} icon={XCircle} color="red" />
              <SummaryCard title="Late" value={summary.late} icon={Clock3} color="amber" />
              <SummaryCard title="Students" value={studentList.length} icon={Users} color="blue" />
            </div>

            {canManage && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => markAll('present')} disabled={studentList.length === 0}>
                    Mark All Present
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => markAll('absent')} disabled={studentList.length === 0}>
                    Mark All Absent
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => markAll('late')} disabled={studentList.length === 0}>
                    Mark All Late
                  </Button>
                </div>

                <Button
                  onClick={() => bulkMark.mutate()}
                  loading={bulkMark.isPending}
                  disabled={studentList.length === 0}
                >
                  Save Attendance
                </Button>
              </div>
            )}

            <Table
              columns={columns}
              data={studentList}
              loading={isTableLoading}
              emptyMessage="No students in this class"
            />
          </CardBody>
        ) : (
          <CardBody className="rounded-b-xl bg-indigo-50/40 py-8">
            <p className="text-center text-sm text-indigo-700/75">
              Select a class to view and mark attendance
            </p>
          </CardBody>
        )}
      </Card>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ElementType
  color: 'emerald' | 'red' | 'amber' | 'blue'
}) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  }

  return (
    <div className="rounded-xl border border-indigo-100/60 bg-white/95 px-4 py-4 shadow-sm shadow-indigo-900/5">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', styles[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}
