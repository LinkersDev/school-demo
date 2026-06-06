import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Table } from '../../../components/ui/Table'
import { Modal } from '../../../components/ui/Modal'
import { Input, Select } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { formatDate } from '../../../utils/format'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'
import { cn } from '../../../utils/cn'
import ScoreSheetsTab from '../components/ScoreSheetsTab'

interface Exam {
  id: number
  name: string
  exam_type: string
  subject: number
  subject_detail: { id: number; name: string }
  assigned_class: number
  class_detail: { id: number; name: string }
  date: string | null
  max_score: number
}

const BLANK_EXAM = { name: '', exam_type: 'quiz', subject: '', assigned_class: '', date: '', max_score: '100' }

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════

export default function GradesPage() {
  const location = useLocation()
  const { hasScope } = useAuth()
  const qc = useQueryClient()
  const canManage = hasScope('grades.manage')
  const canReadGrades = hasScope('grades.read')

  const [tab, setTab] = useState<'exams' | 'sheets'>(() =>
    location.pathname.includes('/grading-legacy') ? 'exams' : 'sheets',
  )

  const [showExamModal, setShowExamModal] = useState(false)
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [editExam, setEditExam] = useState<Exam | null>(null)
  const [editForm, setEditForm] = useState({ name: '', max_score: '' })
  const [examForm, setExamForm] = useState(BLANK_EXAM)
  const [filterClass, setFilterClass] = useState('')
  const [filterSubject, setFilterSubject] = useState('')

  // ── Common queries ───────────────────────────────────────────────────────────
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes/').then(r => r.data.results ?? r.data),
  })
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects/').then(r => r.data.results ?? r.data),
  })

  const { data: assessmentTypesForNames } = useQuery({
    queryKey: ['assessment-types', 'exam-name-suggestions'],
    queryFn: () =>
      api
        .get('/assessment-types/', { params: { page_size: 200 } })
        .then((r) => r.data.results ?? r.data),
    enabled: canReadGrades || canManage,
  })

  const examNameSuggestions = useMemo(() => {
    const rows = Array.isArray(assessmentTypesForNames) ? assessmentTypesForNames : []
    return [...new Set(rows.map((x: { name: string }) => x.name).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    )
  }, [assessmentTypesForNames])

  // ── Exams queries ────────────────────────────────────────────────────────────
  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['exams', filterClass, filterSubject],
    queryFn: () => api.get('/exams/', {
      params: {
        ...(filterClass && { assigned_class: filterClass }),
        ...(filterSubject && { subject: filterSubject }),
      },
    }).then(r => r.data),
    enabled: tab === 'exams',
  })

  const createExam = useMutation({
    mutationFn: (d: object) => api.post('/exams/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); toast.success('Exam created'); setShowExamModal(false) },
    onError: () => toast.error('Failed to create exam'),
  })

  const updateExam = useMutation({
    mutationFn: (d: object) => api.patch(`/exams/${editExam!.id}/`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); toast.success('Exam updated'); setEditExam(null) },
    onError: () => toast.error('Failed to update exam'),
  })

  const examList: Exam[] = exams?.results ?? exams ?? []

  // ── Exam columns ─────────────────────────────────────────────────────────────
  const examColumns = [
    {
      header: 'Exam',
      render: (e: Exam) => (
        <div>
          <div className="font-medium">{e.name}</div>
          <div className="text-xs text-gray-400 capitalize">{e.exam_type}</div>
        </div>
      ),
    },
    { header: 'Subject', render: (e: Exam) => e.subject_detail?.name ? <Badge color="blue">{e.subject_detail.name}</Badge> : '—' },
    { header: 'Class', render: (e: Exam) => e.class_detail?.name ? <Badge color="purple">{e.class_detail.name}</Badge> : '—' },
    { header: 'Max Score', render: (e: Exam) => <span className="font-mono font-medium">{e.max_score}</span> },
    { header: 'Date', render: (e: Exam) => e.date ? formatDate(e.date) : <span className="text-gray-400 text-xs italic">—</span> },
    {
      header: 'Actions',
      render: (e: Exam) => (
        <div className="flex items-center gap-1">
          {canManage && (
            <button onClick={() => { setEditForm({ name: e.name, max_score: String(e.max_score) }); setEditExam(e) }} title="Edit exam" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setSelectedExam(e)}>Enter Grades</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-w-0 space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Grades & Exams</h1>
          <p className="mt-0.5 text-sm text-gray-500">Exams, score sheets, and assessment management</p>
        </div>
        {tab === 'exams' && canManage && (
          <Button
            className="min-h-[44px] w-full sm:w-auto"
            onClick={() => { setExamForm(BLANK_EXAM); setShowExamModal(true) }}
          >
            <Plus className="h-4 w-4" /> Create Exam
          </Button>
        )}
      </div>

      {/* ── Main Tabs ── */}
      <div className="-mx-1 overflow-x-auto border-b border-gray-200">
        <div className="flex min-w-0 gap-0 px-1">
        {([
          { id: 'exams', label: 'Exams' },
          { id: 'sheets', label: 'Score Sheets' },
        ] as const).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-5',
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
        </div>
      </div>

      {/* ══════════════════════ EXAMS TAB ══════════════════════ */}
      {tab === 'exams' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto sm:min-w-[10rem]">
              <option value="">All Classes</option>
              {(classes ?? []).map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto sm:min-w-[10rem]">
              <option value="">All Subjects</option>
              {(subjects ?? []).map((s: { id: number; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Card>
            <div className="min-w-0 overflow-x-auto">
              <Table columns={examColumns} data={examList} loading={examsLoading} emptyMessage="No exams yet" />
            </div>
          </Card>

          {/* Create Exam Modal */}
          <Modal open={showExamModal} onClose={() => setShowExamModal(false)} title="Create Exam" size="lg">
            <form onSubmit={e => { e.preventDefault(); createExam.mutate({ ...examForm, date: examForm.date || null }) }} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Exam Name</label>
                <input list="exam-name-suggestions" value={examForm.name} onChange={e => setExamForm(p => ({ ...p, name: e.target.value }))} placeholder="Type or select..." required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <datalist id="exam-name-suggestions">
                  {examNameSuggestions.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
              <Select label="Type" value={examForm.exam_type} onChange={e => setExamForm(p => ({ ...p, exam_type: e.target.value }))}>
                {['quiz', 'midterm', 'final', 'assignment', 'project'].map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Class" value={examForm.assigned_class} onChange={e => setExamForm(p => ({ ...p, assigned_class: e.target.value }))} required>
                  <option value="">— Select Class —</option>
                  {(classes ?? []).map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select label="Subject" value={examForm.subject} onChange={e => setExamForm(p => ({ ...p, subject: e.target.value }))} required>
                  <option value="">— Select Subject —</option>
                  {(subjects ?? []).map((s: { id: number; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date (optional)" type="date" value={examForm.date} onChange={e => setExamForm(p => ({ ...p, date: e.target.value }))} />
                <Input label="Max Score" type="number" min={1} value={examForm.max_score} onChange={e => setExamForm(p => ({ ...p, max_score: e.target.value }))} required />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => setShowExamModal(false)}>Cancel</Button>
                <Button type="submit" loading={createExam.isPending}>Create</Button>
              </div>
            </form>
          </Modal>

          {/* Edit Exam Modal */}
          <Modal open={!!editExam} onClose={() => setEditExam(null)} title="Edit Exam" size="sm">
            <div className="mb-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span className="font-medium">Class:</span> {editExam?.class_detail?.name} &nbsp;·&nbsp;
              <span className="font-medium">Subject:</span> {editExam?.subject_detail?.name}
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!editForm.name.trim()) return toast.error('Name required'); if (Number(editForm.max_score) <= 0) return toast.error('Max score must be positive'); updateExam.mutate({ name: editForm.name, max_score: Number(editForm.max_score) }) }} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Exam Name</label>
                <input list="exam-name-suggestions-edit" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <datalist id="exam-name-suggestions-edit">
                  {examNameSuggestions.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
              <Input label="Max Score" type="number" min={1} value={editForm.max_score} onChange={e => setEditForm(p => ({ ...p, max_score: e.target.value }))} required />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => setEditExam(null)}>Cancel</Button>
                <Button type="submit" loading={updateExam.isPending}>Save Changes</Button>
              </div>
            </form>
          </Modal>

          {selectedExam && <GradeEntryModal exam={selectedExam} onClose={() => setSelectedExam(null)} />}
        </>
      )}

      {tab === 'sheets' && <ScoreSheetsTab />}
    </div>
  )
}

function GradeEntryModal({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const qc = useQueryClient()
  const [grades, setGrades] = useState<Record<number, string>>({})

  const classId = exam.assigned_class ?? exam.class_detail?.id
  const { data: students } = useQuery({
    queryKey: ['students-by-class', classId],
    queryFn: () => api.get('/students/', { params: { assigned_class: classId } }).then(r => r.data.results ?? r.data),
    enabled: !!classId,
  })

  const { data: existingGrades } = useQuery({
    queryKey: ['grades', exam.id],
    queryFn: () => api.get('/grades/', { params: { exam: exam.id } }).then(r => r.data.results ?? r.data),
  })

  const existingMap = Object.fromEntries(
    (existingGrades ?? []).map((g: { student: number; score: number }) => [g.student, g.score])
  )

  const save = useMutation({
    mutationFn: () =>
      api.post('/grades/bulk-enter/', {
        exam: exam.id,
        grades: (students ?? [])
          .filter((s: { id: number }) => grades[s.id] !== undefined && grades[s.id] !== '')
          .map((s: { id: number }) => ({ student: s.id, score: Number(grades[s.id]) })),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grades'] }); toast.success('Grades saved'); onClose() },
    onError: () => toast.error('Failed to save grades'),
  })

  const studentList: { id: number; full_name: string; student_id: string }[] = students ?? []

  return (
    <Modal open onClose={onClose} title={`Enter Grades: ${exam.name}`} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <span><strong>Class:</strong> {exam.class_detail?.name}</span>
          <span>·</span>
          <span><strong>Subject:</strong> {exam.subject_detail?.name}</span>
          <span>·</span>
          <span><strong>Max Score:</strong> {exam.max_score}</span>
        </div>

        {studentList.length === 0 && (
          <div className="text-center py-6 text-sm text-gray-400">No students in this class.</div>
        )}

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {studentList.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-1">
              <span className="flex-1 text-sm font-medium">
                {s.full_name} <span className="text-gray-400 font-normal">({s.student_id})</span>
              </span>
              <input
                type="number"
                min={0}
                max={exam.max_score}
                placeholder={existingMap[s.id] !== undefined ? String(existingMap[s.id]) : '—'}
                value={grades[s.id] ?? ''}
                onChange={e => setGrades(p => ({ ...p, [s.id]: e.target.value }))}
                className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-xs text-gray-400 w-16 text-right">
                {existingMap[s.id] !== undefined && grades[s.id] === undefined
                  ? <span className="text-green-600 font-medium">✓ {existingMap[s.id]}</span>
                  : null}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-gray-400">
            {Object.values(grades).filter(v => v !== '').length} of {studentList.length} filled
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={studentList.length === 0}>
              Save Grades
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
