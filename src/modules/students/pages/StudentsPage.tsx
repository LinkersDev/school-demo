import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, Pencil, LayoutList, LayoutGrid,
  GraduationCap, UserCheck, UserX,
  X, ClipboardList, BarChart2, Users, ChevronRight, School,
  AlertTriangle,
  User, Mail, CheckCircle2, UserPlus, Loader2, Link2, Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  studentsService, parentsService,
  type Student, type ParentLookupResult, type LinkParentPayload,
} from '../services/students.service'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Badge, StatusBadge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { Input, Select, Textarea } from '../../../components/ui/Input'
import { Card, CardBody } from '../../../components/ui/Card'
import { useAuth } from '../../../hooks/useAuth'
import { formatDate } from '../../../utils/format'
import api from '../../../services/api'
import { cn } from '../../../utils/cn'
import { TeacherWorkspaceShell } from '../../../components/teacher/TeacherWorkspaceShell'

const BLANK = {
  first_name: '', last_name: '', student_id: '', gender: 'male',
  assigned_class: '', date_of_birth: '', address: '',
  medical_notes: '', behavior_notes: '',
}

// ── Types ──────────────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'grid'

interface Filters {
  search: string
  grade: string
  classId: string
  gender: string
  status: string
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const { hasScope, user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const isTeacher = user?.role === 'teacher'

  const [view, setView] = useState<ViewMode>('table')
  const [filters, setFilters] = useState<Filters>({ search: '', grade: '', classId: '', gender: '', status: '' })
  const [showEnroll, setShowEnroll] = useState(false)
  const [showLinkParent, setShowLinkParent] = useState(false)
  const [linkParentStudent, setLinkParentStudent] = useState<Student | null>(null)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null)
  const [form, setForm] = useState(BLANK)

  // ── Data queries ─────────────────────────────────────────────────────────────

  const queryParams = {
    search: filters.search || undefined,
    assigned_class: filters.classId || undefined,
    gender: filters.gender || undefined,
    is_active: filters.status === 'active' ? true : filters.status === 'inactive' ? false : undefined,
    page_size: 200,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['students', queryParams],
    queryFn: () => studentsService.list(queryParams),
  })

  const { data: allData } = useQuery({
    queryKey: ['students-all-count'],
    queryFn: () => studentsService.list({ page_size: 1 }),
  })

  const { data: activeData } = useQuery({
    queryKey: ['students-active-count'],
    queryFn: () => studentsService.list({ is_active: true, page_size: 1 }),
  })

  const { data: parentsData } = useQuery({
    queryKey: ['parents-total-count'],
    queryFn: () => api.get('/parents/', { params: { page_size: 1 } }).then(r => r.data),
    enabled: !isTeacher && hasScope('parents.read'),
  })

  // Attendance report for overview stats
  const { data: attendanceReport } = useQuery({
    queryKey: ['attendance-report-overview'],
    queryFn: () => api.get('/attendance/report/').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const CLASSES_PAGE = 500
  const { data: classesData } = useQuery({
    queryKey: ['classes', 'students', CLASSES_PAGE],
    queryFn: () => api.get('/classes/', { params: { page_size: CLASSES_PAGE } }).then((r) => r.data.results ?? r.data),
  })

  const classes: { id: number; name: string; grade_level: string }[] = classesData ?? []
  const students: Student[] = data?.results ?? data ?? []

  // Client-side grade filter (grade_level not a direct API filter)
  const filteredStudents = useMemo(() => {
    if (!filters.grade) return students
    return students.filter(s => s.assigned_class_detail?.grade_level === filters.grade)
  }, [students, filters.grade])

  // Unique grade levels from classes list
  const gradeLevels = useMemo(() => {
    const seen = new Set<string>()
    return classes.filter(c => { const ok = !seen.has(c.grade_level); seen.add(c.grade_level); return ok })
      .map(c => c.grade_level)
      .sort()
  }, [classes])

  // ── Stats computations ────────────────────────────────────────────────────────

  const totalStudents = allData?.count ?? 0
  const activeStudents = activeData?.count ?? 0
  const inactiveStudents = totalStudents - activeStudents
  const totalParents = parentsData?.count ?? 0
  const totalClasses = classes.length

  // Attendance derived stats
  const attendanceStats = useMemo(() => {
    const rows: { total: number; present: number }[] = Array.isArray(attendanceReport)
      ? attendanceReport : []
    const withData = rows.filter(r => r.total > 0)
    if (withData.length === 0) return null
    const rates = withData.map(r => (r.present / r.total) * 100)
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length
    const atRisk = rates.filter(r => r < 80).length
    return { avg: Math.round(avg), atRisk, total: withData.length }
  }, [attendanceReport])

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const create = useMutation({
    mutationFn: studentsService.enroll,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['students-all-count'] })
      qc.invalidateQueries({ queryKey: ['parents'] })
      const msg =
        res.parent_status === 'created'         ? `Student enrolled & parent account created for ${res.parent_name}` :
        res.parent_status === 'linked_existing' ? `Student enrolled & linked to ${res.parent_name}` :
        'Student enrolled successfully'
      toast.success(msg)
      setShowEnroll(false)
    },
    onError: (e: { response?: { data?: Record<string, string[]> } }) => {
      const data = e.response?.data
      const first = data && Object.values(data)[0]
      toast.error(Array.isArray(first) ? first[0] : 'Failed to enroll student')
    },
  })

  const linkParent = useMutation({
    mutationFn: ({ studentId, payload }: { studentId: number; payload: LinkParentPayload }) =>
      studentsService.linkParent(studentId, payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['parents'] })
      const msg =
        res.parent_status === 'created'
          ? `Parent account created & linked — ${res.parent_name}`
          : `Linked to existing parent — ${res.parent_name}`
      toast.success(msg)
      setShowLinkParent(false)
      setLinkParentStudent(null)
    },
    onError: (e: { response?: { data?: Record<string, string[]> } }) => {
      const d = e.response?.data
      const first = d && Object.values(d)[0]
      toast.error(Array.isArray(first) ? first[0] : 'Failed to link parent')
    },
  })

  const update = useMutation({
    mutationFn: (d: object) => api.patch(`/students/${editStudent!.id}/`, d),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success('Student updated')
      // Refresh drawer if it's open on this student
      if (drawerStudent?.id === editStudent?.id) {
        setDrawerStudent(prev => prev ? { ...prev, ...(vars as Partial<Student>) } : null)
      }
      setEditStudent(null)
    },
    onError: () => toast.error('Failed to update student'),
  })

  const openEdit = (s: Student) => {
    setForm({
      first_name: s.first_name,
      last_name: s.last_name,
      student_id: s.student_id,
      gender: s.gender,
      assigned_class: s.assigned_class_detail ? String(s.assigned_class_detail.id) : '',
      date_of_birth: s.date_of_birth ?? '',
      address: '',
      medical_notes: s.medical_notes ?? '',
      behavior_notes: s.behavior_notes ?? '',
    })
    setEditStudent(s)
  }

  const setFilter = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setFilters(p => ({ ...p, [key]: e.target.value }))

  const clearFilters = () => setFilters({ search: '', grade: '', classId: '', gender: '', status: '' })
  const hasActiveFilters = Object.values(filters).some(Boolean)

  // ── Table columns ─────────────────────────────────────────────────────────────

  const columns = [
    {
      header: 'Student',
      render: (s: Student) => (
        <button
          onClick={() => setDrawerStudent(s)}
          className="flex items-center gap-3 text-left group"
        >
          <StudentAvatar name={s.first_name} gender={s.gender} size="sm" />
          <div>
            <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {s.full_name}
            </div>
            <div className="text-xs text-gray-400">{s.student_id}</div>
          </div>
        </button>
      ),
    },
    {
      header: 'Class',
      render: (s: Student) => s.assigned_class_detail ? (
        <div>
          <div className="text-sm font-medium text-gray-700">{s.assigned_class_detail.name}</div>
          <div className="text-xs text-gray-400">{s.assigned_class_detail.grade_level}</div>
        </div>
      ) : <span className="text-gray-400">—</span>,
    },
    {
      header: 'Gender',
      render: (s: Student) => (
        <Badge color={s.gender === 'male' ? 'blue' : 'purple'} className="capitalize">{s.gender}</Badge>
      ),
    },
    {
      header: 'DOB',
      render: (s: Student) => s.date_of_birth
        ? <span className="text-sm text-gray-600">{formatDate(s.date_of_birth)}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      header: 'Status',
      render: (s: Student) => (
        <Badge color={s.is_active ? 'green' : 'red'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      header: '',
      render: (s: Student) => (
        <div className="flex items-center gap-1 justify-end">
          {hasScope('students.manage') && (
            <>
              <button
                onClick={e => { e.stopPropagation(); openEdit(s) }}
                title="Edit student"
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setLinkParentStudent(s); setShowLinkParent(true) }}
                title="Link parent"
                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
              >
                <Link2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setDrawerStudent(s)}
            title="View details"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  const teacherSurface = 'border-white/50 bg-white/80 shadow-sm shadow-indigo-900/5 backdrop-blur-sm'

  const pageInner = (
    <div className={cn('min-w-0 space-y-5', isTeacher && 'relative')}>
      {/* ── Header ── */}
      {!isTeacher ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Students</h1>
            <p className="mt-0.5 text-sm text-gray-500">Manage and monitor all students</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            {hasScope('students.manage') && (
              <Button className="min-h-[44px] w-full sm:w-auto" onClick={() => setShowEnroll(true)}>
                <Plus className="h-4 w-4" /> Add Student
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. Students */}
        <Card className={cn(isTeacher && teacherSurface)}>
          <CardBody className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{isTeacher ? 'My Students' : 'Total Students'}</p>
              <p className="text-3xl font-bold text-gray-900 leading-tight">{totalStudents}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isTeacher ? 'Students in your assigned classes' : 'enrolled this academic year'}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* 2. My Classes / Attendance */}
        {isTeacher ? (
          <Card className={teacherSurface}>
            <CardBody className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600 flex-shrink-0">
                <School className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">My Classes</p>
                <p className="text-3xl font-bold text-gray-900 leading-tight">{totalClasses}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {gradeLevels.length} grade{gradeLevels.length !== 1 ? 's' : ''} assigned
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700">Attendance Overview</span>
              </div>
              {attendanceStats && attendanceStats.atRisk > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  {attendanceStats.atRisk} at risk
                </span>
              )}
            </div>
            {attendanceStats ? (
              <>
                <div className="flex items-end gap-2 mb-2">
                  <span className={cn(
                    'text-3xl font-bold leading-tight',
                    attendanceStats.avg >= 80 ? 'text-emerald-600' :
                    attendanceStats.avg >= 60 ? 'text-amber-600' : 'text-red-600'
                  )}>
                    {attendanceStats.avg}%
                  </span>
                  <span className="text-xs text-gray-400 mb-1">avg attendance</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      attendanceStats.avg >= 80 ? 'bg-emerald-500' :
                      attendanceStats.avg >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                    style={{ width: `${attendanceStats.avg}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Based on {attendanceStats.total} student{attendanceStats.total !== 1 ? 's' : ''} with records
                </p>
              </>
            ) : (
              <div className="text-sm text-gray-400 italic mt-1">No attendance data yet</div>
            )}
          </CardBody>
        </Card>
        )}

        {/* 3. Attendance / Student Status */}
        {isTeacher ? (
          <Card className={teacherSurface}>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Attendance Overview</span>
                </div>
                {attendanceStats && attendanceStats.atRisk > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    {attendanceStats.atRisk} at risk
                  </span>
                )}
              </div>
              {attendanceStats ? (
                <>
                  <div className="flex items-end gap-2 mb-2">
                    <span className={cn(
                      'text-3xl font-bold leading-tight',
                      attendanceStats.avg >= 80 ? 'text-emerald-600' :
                      attendanceStats.avg >= 60 ? 'text-amber-600' : 'text-red-600'
                    )}>
                      {attendanceStats.avg}%
                    </span>
                    <span className="text-xs text-gray-400 mb-1">avg attendance</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        attendanceStats.avg >= 80 ? 'bg-emerald-500' :
                        attendanceStats.avg >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${attendanceStats.avg}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Based on your students with attendance records
                  </p>
                </>
              ) : (
                <div className="text-sm text-gray-400 italic mt-1">No attendance data yet</div>
              )}
            </CardBody>
          </Card>
        ) : null}

        {/* 4. Student Status */}
        <Card className={cn(isTeacher && teacherSurface)}>
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-700">Student Status</span>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div>
                <div className="text-2xl font-bold text-emerald-600 leading-tight">{activeStudents}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Active</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <div className="text-2xl font-bold text-red-500 leading-tight">{inactiveStudents}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1"><UserX className="w-3 h-3" /> Inactive</div>
              </div>
            </div>
            {/* Split bar */}
            {totalStudents > 0 && (
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(activeStudents / totalStudents) * 100}%` }}
                />
                <div className="h-full bg-red-400 flex-1" />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              {totalStudents > 0 ? `${Math.round((activeStudents / totalStudents) * 100)}% active` : '—'}
            </p>
          </CardBody>
        </Card>

        {!isTeacher && (
          <button
            type="button"
            onClick={() => navigate('/parents')}
            className="text-left"
          >
            <Card className="h-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
              <CardBody className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-violet-50 text-violet-600 flex-shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Parents</p>
                  <p className="text-3xl font-bold text-gray-900 leading-tight">{totalParents}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Linked parent accounts</p>
                </div>
              </CardBody>
            </Card>
          </button>
        )}
      </div>

      {/* ── Filters + View Toggle ── */}
      <Card className={cn(isTeacher && teacherSurface)}>
        <CardBody className="py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Search */}
            <div className="relative min-w-0 flex-1 sm:min-w-[12rem]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                placeholder="Search by name or ID..."
                value={filters.search}
                onChange={setFilter('search')}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Grade */}
            <select
              value={filters.grade}
              onChange={setFilter('grade')}
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto sm:min-w-[8rem]"
            >
              <option value="">All Grades</option>
              {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            {/* Class */}
            <select
              value={filters.classId}
              onChange={setFilter('classId')}
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto sm:min-w-[10rem]"
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Gender */}
            <select
              value={filters.gender}
              onChange={setFilter('gender')}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            {/* Status */}
            <select
              value={filters.status}
              onChange={setFilter('status')}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}

            {/* View toggle */}
            <div className="flex items-center gap-1 self-stretch rounded-lg border border-gray-200 p-0.5 sm:ml-auto sm:self-auto">
              <button
                onClick={() => setView('table')}
                className={cn('p-1.5 rounded transition', view === 'table' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600')}
                title="Table view"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={cn('p-1.5 rounded transition', view === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600')}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Filters:</span>
              {filters.search && <FilterChip label={`"${filters.search}"`} onRemove={() => setFilters(p => ({ ...p, search: '' }))} />}
              {filters.grade && <FilterChip label={filters.grade} onRemove={() => setFilters(p => ({ ...p, grade: '' }))} />}
              {filters.classId && <FilterChip label={classes.find(c => String(c.id) === filters.classId)?.name ?? ''} onRemove={() => setFilters(p => ({ ...p, classId: '' }))} />}
              {filters.gender && <FilterChip label={filters.gender} onRemove={() => setFilters(p => ({ ...p, gender: '' }))} />}
              {filters.status && <FilterChip label={filters.status} onRemove={() => setFilters(p => ({ ...p, status: '' }))} />}
              <span className="text-xs text-gray-400 ml-auto">{filteredStudents.length} result{filteredStudents.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Students List ── */}
      {view === 'table' ? (
        <Card className={cn(isTeacher && teacherSurface)}>
          <div className="min-w-0 overflow-x-auto">
            <Table
              columns={columns}
              data={filteredStudents}
              loading={isLoading}
              emptyMessage="No students match your filters"
            />
          </div>
        </Card>
      ) : (
        <StudentGrid
          students={filteredStudents}
          loading={isLoading}
          onOpen={setDrawerStudent}
          onEdit={openEdit}
          canManage={hasScope('students.manage')}
          teacherGlass={isTeacher}
        />
      )}

      {/* ── Student Drawer ── */}
      <StudentDrawer
        student={drawerStudent}
        onClose={() => setDrawerStudent(null)}
        onEdit={() => drawerStudent && openEdit(drawerStudent)}
        canManage={hasScope('students.manage')}
      />

      {/* ── Enroll Modal ── */}
      <EnrollStudentModal
        open={showEnroll}
        classes={classes}
        onClose={() => setShowEnroll(false)}
        onSubmit={(payload) => create.mutate(payload)}
        loading={create.isPending}
      />

      {/* ── Link Parent Modal ── */}
      <LinkParentModal
        student={linkParentStudent}
        open={showLinkParent}
        onClose={() => { setShowLinkParent(false); setLinkParentStudent(null) }}
        onSubmit={(studentId, payload) => linkParent.mutate({ studentId, payload })}
        loading={linkParent.isPending}
      />

      {/* ── Edit Modal ── */}
      <StudentFormModal
        open={!!editStudent}
        title={`Edit: ${editStudent?.full_name ?? ''}`}
        form={form}
        setForm={setForm}
        classes={classes}
        onClose={() => setEditStudent(null)}
        onSubmit={() => update.mutate({ ...form, assigned_class: form.assigned_class || null })}
        loading={update.isPending}
        submitLabel="Save Changes"
      />
    </div>
  )

  if (isTeacher) {
    return (
      <TeacherWorkspaceShell
        title="My students"
        subtitle="Only students enrolled in your assigned classes appear here. Use filters to narrow by class or grade."
        heroIcon={UserCheck}
      >
        {pageInner}
      </TeacherWorkspaceShell>
    )
  }
  return pageInner
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-blue-900">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

function StudentAvatar({ name, gender, size = 'md' }: { name: string; gender: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-10 h-10 text-base'
  const colorClass = gender === 'female'
    ? 'bg-purple-100 text-purple-600'
    : 'bg-blue-100 text-blue-600'
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold flex-shrink-0', sizeClass, colorClass)}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ── Grid View ──────────────────────────────────────────────────────────────────

const TEACHER_GRID_CARD =
  'border-white/50 bg-white/80 shadow-sm shadow-indigo-900/5 backdrop-blur-sm'

function StudentGrid({
  students, loading, onOpen, onEdit, canManage, teacherGlass,
}: {
  students: Student[]
  loading: boolean
  onOpen: (s: Student) => void
  onEdit: (s: Student) => void
  canManage: boolean
  teacherGlass?: boolean
}) {
  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-xl border h-44 animate-pulse',
            teacherGlass ? 'border-white/40 bg-white/50' : 'bg-white border-gray-200',
          )}
        />
      ))}
    </div>
  )

  if (students.length === 0) return (
    <Card className={cn(teacherGlass && TEACHER_GRID_CARD)}>
      <CardBody className="py-16 text-center">
        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-400">No students match your filters</p>
      </CardBody>
    </Card>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {students.map(s => (
        <div
          key={s.id}
          onClick={() => onOpen(s)}
          className={cn(
            'rounded-xl border shadow-sm p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group',
            teacherGlass
              ? TEACHER_GRID_CARD
              : 'bg-white border-gray-200',
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <StudentAvatar name={s.first_name} gender={s.gender} />
            <Badge color={s.is_active ? 'green' : 'red'} className="mt-1">
              {s.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
            {s.full_name}
          </div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">{s.student_id}</div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">{s.assigned_class_detail?.name ?? '—'}</div>
              <div className="text-xs text-gray-400">{s.assigned_class_detail?.grade_level ?? ''}</div>
            </div>
            {canManage && (
              <button
                onClick={e => { e.stopPropagation(); onEdit(s) }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Student Drawer ─────────────────────────────────────────────────────────────

type DrawerTab = 'profile' | 'attendance' | 'grades'

function StudentDrawer({
  student, onClose, onEdit, canManage,
}: {
  student: Student | null
  onClose: () => void
  onEdit: () => void
  canManage: boolean
}) {
  const [tab, setTab] = useState<DrawerTab>('profile')
  const isOpen = !!student

  const { data: attendance } = useQuery({
    queryKey: ['student-attendance-drawer', student?.id],
    queryFn: () => api.get('/attendance/', { params: { student: student!.id, page_size: 15 } }).then(r => r.data),
    enabled: !!student && tab === 'attendance',
  })

  const { data: grades } = useQuery({
    queryKey: ['student-grades-drawer', student?.id],
    queryFn: () => api.get('/grades/', { params: { student: student!.id, page_size: 10 } }).then(r => r.data),
    enabled: !!student && tab === 'grades',
  })

  const attendanceList = attendance?.results ?? attendance ?? []
  const gradesList = grades?.results ?? grades ?? []

  const presentCount = attendanceList.filter((a: { status: string }) => a.status === 'present').length
  const attendancePct = attendanceList.length > 0
    ? Math.round((presentCount / attendanceList.length) * 100)
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[460px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {student && (
          <>
            {/* Drawer header */}
            <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
              <StudentAvatar name={student.first_name} gender={student.gender} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-lg truncate">{student.full_name}</div>
                <div className="text-sm text-gray-400 font-mono">{student.student_id}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge color={student.is_active ? 'green' : 'red'}>
                    {student.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge color={student.gender === 'male' ? 'blue' : 'purple'} className="capitalize">
                    {student.gender}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {canManage && (
                  <button
                    onClick={onEdit}
                    title="Edit student"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <Link
                  to={`/students/${student.id}`}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  title="Full profile page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-gray-100 px-6">
              {([
                { id: 'profile', label: 'Profile', Icon: GraduationCap },
                { id: 'attendance', label: 'Attendance', Icon: ClipboardList },
                { id: 'grades', label: 'Grades', Icon: BarChart2 },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    tab === t.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  <t.Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {/* ── Profile Tab ── */}
              {tab === 'profile' && (
                <div className="p-6 space-y-5">
                  {/* Class info */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="text-xs font-medium text-blue-500 uppercase tracking-wide mb-2">Class</div>
                    <div className="font-semibold text-blue-900 text-lg">
                      {student.assigned_class_detail?.name ?? '—'}
                    </div>
                    <div className="text-sm text-blue-600">{student.assigned_class_detail?.grade_level ?? ''}</div>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-3">
                    {[
                      ['Date of Birth', student.date_of_birth ? formatDate(student.date_of_birth) : '—'],
                      ['Gender', student.gender],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">{k}</span>
                        <span className="text-sm font-medium text-gray-800 capitalize">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Medical notes */}
                  {student.medical_notes && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                      <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Medical Notes</div>
                      <p className="text-sm text-red-800">{student.medical_notes}</p>
                    </div>
                  )}

                  {/* Behavior notes */}
                  {student.behavior_notes && (
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                      <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Behavior Notes</div>
                      <p className="text-sm text-orange-800">{student.behavior_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Attendance Tab ── */}
              {tab === 'attendance' && (
                <div className="p-6 space-y-4">
                  {attendancePct !== null && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 flex items-center gap-4">
                      <div className="text-3xl font-bold text-green-700">{attendancePct}%</div>
                      <div>
                        <div className="text-sm font-medium text-green-800">Attendance Rate</div>
                        <div className="text-xs text-green-600">{presentCount} present / {attendanceList.length} records</div>
                      </div>
                      {/* Mini bar */}
                      <div className="ml-auto w-24 h-2 bg-green-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${attendancePct}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {attendanceList.length === 0 && (
                      <div className="text-center py-10 text-gray-400 text-sm">No attendance records yet</div>
                    )}
                    {attendanceList.map((a: { id: number; date: string; status: string; notes?: string }) => (
                      <div key={a.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition">
                        <span className="text-sm text-gray-700">{formatDate(a.date)}</span>
                        <div className="flex items-center gap-2">
                          {a.notes && <span className="text-xs text-gray-400 italic truncate max-w-24">{a.notes}</span>}
                          <StatusBadge status={a.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Grades Tab ── */}
              {tab === 'grades' && (
                <div className="p-6 space-y-3">
                  {gradesList.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">No grades recorded yet</div>
                  )}
                  {gradesList.map((g: { id: number; exam_name: string; score: number; max_score: number; percentage: number }) => {
                    const pct = g.percentage ?? Math.round((g.score / g.max_score) * 100)
                    const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    return (
                      <div key={g.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-800 truncate flex-1 mr-3">{g.exam_name}</span>
                          <span className="font-bold text-gray-900 flex-shrink-0">
                            {g.score}<span className="text-gray-400 font-normal text-xs">/{g.max_score}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={cn(
                            'text-xs font-semibold',
                            pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'
                          )}>{pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── Enroll Student Modal (create + parent lookup) ──────────────────────────────

const BLANK_ENROLL = {
  first_name: '', last_name: '', gender: 'male',
  assigned_class: '', date_of_birth: '', address: '',
  medical_notes: '', behavior_notes: '',
}

const BLANK_PARENT = {
  email: '', phone: '', first_name: '', last_name: '',
  relationship: 'guardian', is_primary: true,
}

function EnrollStudentModal({
  open, classes, onClose, onSubmit, loading,
}: {
  open: boolean
  classes: { id: number; name: string }[]
  onClose: () => void
  onSubmit: (payload: import('../services/students.service').EnrollPayload) => void
  loading: boolean
}) {
  const [student, setStudent] = useState(BLANK_ENROLL)
  const [parent, setParent]   = useState(BLANK_PARENT)
  const [lookup, setLookup]   = useState<ParentLookupResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const lookupDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetForm = () => {
    setStudent(BLANK_ENROLL)
    setParent(BLANK_PARENT)
    setLookup(null)
  }

  const handleClose = () => { resetForm(); onClose() }

  const triggerLookup = (email: string, phone: string) => {
    if (lookupDebounce.current) clearTimeout(lookupDebounce.current)
    if (!email.trim() && !phone.trim()) { setLookup(null); return }
    lookupDebounce.current = setTimeout(async () => {
      setLookupLoading(true)
      try {
        const result = await parentsService.lookup({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        })
        setLookup(result)
      } catch {
        setLookup(null)
      } finally {
        setLookupLoading(false)
      }
    }, 600)
  }

  const setStudentField = (key: keyof typeof BLANK_ENROLL) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setStudent(p => ({ ...p, [key]: e.target.value }))

  const setParentField = (key: keyof typeof BLANK_PARENT) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.value
      setParent(p => ({ ...p, [key]: val }))
      if (key === 'email' || key === 'phone') {
        triggerLookup(
          key === 'email' ? val : parent.email,
          key === 'phone' ? val : parent.phone,
        )
      }
    }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      // Student (student_id omitted — auto-generated by backend)
      first_name:     student.first_name,
      last_name:      student.last_name,
      gender:         student.gender,
      assigned_class: student.assigned_class || null,
      date_of_birth:  student.date_of_birth  || undefined,
      address:        student.address        || undefined,
      medical_notes:  student.medical_notes  || undefined,
      behavior_notes: student.behavior_notes || undefined,
      // Parent (only send if something was entered)
      parent_email:        parent.email       || undefined,
      parent_first_name:   (lookup?.found ? undefined : parent.first_name) || undefined,
      parent_last_name:    (lookup?.found ? undefined : parent.last_name)  || undefined,
      parent_phone:        parent.phone       || undefined,
      parent_relationship: parent.relationship,
      parent_is_primary:   parent.is_primary,
    })
  }

  const showNewParentFields = !lookup?.found && (parent.email || parent.phone)

  return (
    <Modal open={open} onClose={handleClose} title="Enroll New Student" size="xl">
      <form onSubmit={handleSubmit} className="space-y-0">

        {/* ── Student Info ─────────────────────────────────────────────── */}
        <div className="pb-4 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Student Information</h3>
            <span className="ml-auto flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              <Info className="w-3 h-3" />
              ID auto-generated
            </span>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" value={student.first_name} onChange={setStudentField('first_name')} required />
              <Input label="Last Name"  value={student.last_name}  onChange={setStudentField('last_name')}  required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Gender" value={student.gender} onChange={setStudentField('gender')}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
              <Input label="Date of Birth" type="date" value={student.date_of_birth} onChange={setStudentField('date_of_birth')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Class" value={student.assigned_class} onChange={setStudentField('assigned_class')}>
                <option value="">— No Class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input label="Address" value={student.address} onChange={setStudentField('address')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Textarea label="Medical Notes"  value={student.medical_notes}  onChange={setStudentField('medical_notes')}  />
              <Textarea label="Behavior Notes" value={student.behavior_notes} onChange={setStudentField('behavior_notes')} />
            </div>
          </div>
        </div>

        {/* ── Parent Info ──────────────────────────────────────────────── */}
        <div className="pb-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Parent / Guardian</h3>
            <span className="text-xs text-gray-400">(optional)</span>
          </div>

          <div className="space-y-3">
            {/* Lookup fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  label="Parent Email"
                  type="email"
                  value={parent.email}
                  onChange={setParentField('email')}
                  placeholder="Search by email…"
                />
                {lookupLoading && (
                  <Loader2 className="absolute right-3 top-8 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </div>
              <div className="relative">
                <Input
                  label="Parent Phone"
                  value={parent.phone}
                  onChange={setParentField('phone')}
                  placeholder="Search by phone…"
                />
              </div>
            </div>

            {/* Lookup result banner */}
            {lookup?.found && lookup.parent && (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">
                    Parent found — will be linked
                  </p>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    {lookup.parent.name}
                    {lookup.parent.phone && <span className="text-emerald-500"> · {lookup.parent.phone}</span>}
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Already has {lookup.parent.children_count} child{lookup.parent.children_count !== 1 ? 'ren' : ''} linked
                  </p>
                </div>
              </div>
            )}

            {lookup?.found === false && (parent.email || parent.phone) && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                <UserPlus className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  No parent account found — fill in the details below to create one.
                </p>
              </div>
            )}

            {/* New parent fields — only when not found */}
            {showNewParentFields && !lookup?.found && (
              <div className="space-y-3 pl-3 border-l-2 border-amber-200">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Name"
                    value={parent.first_name}
                    onChange={setParentField('first_name')}
                    placeholder="Required to create account"
                  />
                  <Input
                    label="Last Name"
                    value={parent.last_name}
                    onChange={setParentField('last_name')}
                  />
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {parent.email
                    ? 'A secure login account will be created with the email above.'
                    : 'No email entered — a school email will be auto-generated from the name above.'}
                  {' '}A temporary password is auto-generated; the parent can reset it on first login.
                </p>
              </div>
            )}

            {/* Relationship (shown whenever email/phone is typed) */}
            {(parent.email || parent.phone) && (
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Relationship"
                  value={parent.relationship}
                  onChange={setParentField('relationship')}
                >
                  {['father', 'mother', 'guardian', 'other'].map(r => (
                    <option key={r} value={r} className="capitalize">{r}</option>
                  ))}
                </Select>
                <div className="flex items-center gap-2 mt-6">
                  <input
                    id="is_primary"
                    type="checkbox"
                    checked={parent.is_primary}
                    onChange={e => setParent(p => ({ ...p, is_primary: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_primary" className="text-sm text-gray-700 cursor-pointer">
                    Primary guardian
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-4">
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={loading}>
            <GraduationCap className="w-4 h-4" />
            Enroll Student
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Link Parent Modal (existing student → lookup/create parent) ────────────────

const BLANK_LINK_PARENT = {
  email: '', phone: '', first_name: '', last_name: '',
  relationship: 'guardian', is_primary: true,
}

function LinkParentModal({
  student, open, onClose, onSubmit, loading,
}: {
  student: Student | null
  open: boolean
  onClose: () => void
  onSubmit: (studentId: number, payload: LinkParentPayload) => void
  loading: boolean
}) {
  const [parent, setParent]   = useState(BLANK_LINK_PARENT)
  const [lookup, setLookup]   = useState<ParentLookupResult | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetForm = () => { setParent(BLANK_LINK_PARENT); setLookup(null) }
  const handleClose = () => { resetForm(); onClose() }

  const triggerLookup = (email: string, phone: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!email.trim() && !phone.trim()) { setLookup(null); return }
    debounceRef.current = setTimeout(async () => {
      setLookupLoading(true)
      try {
        const result = await parentsService.lookup({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        })
        setLookup(result)
      } catch {
        setLookup(null)
      } finally {
        setLookupLoading(false)
      }
    }, 600)
  }

  const setField = (key: keyof typeof BLANK_LINK_PARENT) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.value
      setParent(p => ({ ...p, [key]: val }))
      if (key === 'email' || key === 'phone') {
        triggerLookup(
          key === 'email' ? val : parent.email,
          key === 'phone' ? val : parent.phone,
        )
      }
    }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!student) return
    onSubmit(student.id, {
      parent_email:        parent.email       || undefined,
      parent_first_name:   (lookup?.found ? undefined : parent.first_name) || undefined,
      parent_last_name:    (lookup?.found ? undefined : parent.last_name)  || undefined,
      parent_phone:        parent.phone       || undefined,
      parent_relationship: parent.relationship,
      parent_is_primary:   parent.is_primary,
    })
  }

  const showNewFields = !lookup?.found && (parent.email || parent.phone || parent.first_name)

  return (
    <Modal open={open} onClose={handleClose} title="Link Parent / Guardian" size="lg">
      {student && (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Student banner */}
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {student.first_name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">{student.full_name}</p>
              <p className="text-xs text-blue-500 font-mono">{student.student_id}</p>
            </div>
          </div>

          {/* Lookup fields */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Find or create parent
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  label="Parent Email"
                  type="email"
                  value={parent.email}
                  onChange={setField('email')}
                  placeholder="Search by email…"
                />
                {lookupLoading && (
                  <Loader2 className="absolute right-3 top-8 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </div>
              <Input
                label="Parent Phone"
                value={parent.phone}
                onChange={setField('phone')}
                placeholder="Search by phone…"
              />
            </div>
          </div>

          {/* Found banner */}
          {lookup?.found && lookup.parent && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800">Parent found — will be linked</p>
                <p className="text-sm text-emerald-700 mt-0.5">
                  {lookup.parent.name}
                  {lookup.parent.phone && <span className="text-emerald-500"> · {lookup.parent.phone}</span>}
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Already has {lookup.parent.children_count} child{lookup.parent.children_count !== 1 ? 'ren' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Not found banner */}
          {lookup?.found === false && (parent.email || parent.phone) && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <UserPlus className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                No parent found — fill in the name below to create an account.
              </p>
            </div>
          )}

          {/* New parent name fields */}
          {showNewFields && !lookup?.found && (
            <div className="space-y-3 pl-3 border-l-2 border-amber-200">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  value={parent.first_name}
                  onChange={setField('first_name')}
                  placeholder="Required to create account"
                />
                <Input label="Last Name" value={parent.last_name} onChange={setField('last_name')} />
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {parent.email
                  ? 'Account will be created with the email above.'
                  : 'No email — a school email will be auto-generated from the name.'}
                {' '}A temporary password is auto-generated.
              </p>
            </div>
          )}

          {/* Relationship row */}
          {(parent.email || parent.phone || parent.first_name) && (
            <div className="grid grid-cols-2 gap-3">
              <Select label="Relationship" value={parent.relationship} onChange={setField('relationship')}>
                {['father', 'mother', 'guardian', 'other'].map(r => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </Select>
              <div className="flex items-center gap-2 mt-6">
                <input
                  id="lp_primary"
                  type="checkbox"
                  checked={parent.is_primary as boolean}
                  onChange={e => setParent(p => ({ ...p, is_primary: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="lp_primary" className="text-sm text-gray-700 cursor-pointer">
                  Primary guardian
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={loading}>
              <Link2 className="w-4 h-4" />
              {lookup?.found ? 'Link Parent' : 'Create & Link'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

// ── Shared Form Modal ──────────────────────────────────────────────────────────

interface FormState {
  first_name: string
  last_name: string
  student_id: string
  gender: string
  assigned_class: string
  date_of_birth: string
  address: string
  medical_notes: string
  behavior_notes: string
}

function StudentFormModal({
  open, title, form, setForm, classes, onClose, onSubmit, loading, submitLabel,
}: {
  open: boolean
  title: string
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  classes: { id: number; name: string }[]
  onClose: () => void
  onSubmit: () => void
  loading: boolean
  submitLabel: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <form onSubmit={e => { e.preventDefault(); onSubmit() }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} required />
          <Input label="Last Name" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Student ID" value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))} required />
          <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Gender" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
          <Select label="Class" value={form.assigned_class} onChange={e => setForm(p => ({ ...p, assigned_class: e.target.value }))}>
            <option value="">— No Class —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <Input label="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Textarea label="Medical Notes" value={form.medical_notes} onChange={e => setForm(p => ({ ...p, medical_notes: e.target.value }))} />
          <Textarea label="Behavior Notes" value={form.behavior_notes} onChange={e => setForm(p => ({ ...p, behavior_notes: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}
