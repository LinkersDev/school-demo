import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, School, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Table } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'

interface Class {
  id: number
  name: string
  grade_level: string
  section: string
  academic_year: string
  capacity: number
}

interface Subject {
  id: number
  name: string
  code: string
  description: string
  assigned_class: number | null
  assigned_class_detail?: { id: number; name: string }
}

const CURRENT_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
const BLANK_CLASS = { name: '', grade_level: '', section: '', academic_year: CURRENT_YEAR, capacity: '30' }
const BLANK_SUBJECT = { name: '', code: '', description: '', assigned_class: '' }

export default function ClassesPage() {
  const { hasScope } = useAuth()
  const qc = useQueryClient()
  const canManage = hasScope('students.manage') || hasScope('users.manage')
  const [tab, setTab] = useState<'classes' | 'subjects'>('classes')

  const [classModal, setClassModal] = useState(false)
  const [editClass, setEditClass] = useState<Class | null>(null)
  const [deleteClass, setDeleteClass] = useState<Class | null>(null)
  const [classForm, setClassForm] = useState(BLANK_CLASS)

  const [subjectModal, setSubjectModal] = useState(false)
  const [editSubject, setEditSubject] = useState<Subject | null>(null)
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null)
  const [subjectForm, setSubjectForm] = useState(BLANK_SUBJECT)

  const { data: classesData, isLoading: classLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes/').then(r => r.data.results ?? r.data),
  })

  const { data: subjectsData, isLoading: subjectLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects/').then(r => r.data.results ?? r.data),
  })

  const classes: Class[] = classesData ?? []
  const subjects: Subject[] = subjectsData ?? []

  const saveClass = useMutation({
    mutationFn: (d: object) =>
      editClass ? api.patch(`/classes/${editClass.id}/`, d) : api.post('/classes/', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      toast.success(editClass ? 'Class updated' : 'Class created')
      setClassModal(false)
      setEditClass(null)
    },
    onError: () => toast.error('Failed to save class'),
  })

  const destroyClass = useMutation({
    mutationFn: (id: number) => api.delete(`/classes/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.success('Class deleted'); setDeleteClass(null) },
    onError: () => toast.error('Cannot delete — class may have students enrolled'),
  })

  const saveSubject = useMutation({
    mutationFn: (d: object) =>
      editSubject ? api.patch(`/subjects/${editSubject.id}/`, d) : api.post('/subjects/', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] })
      toast.success(editSubject ? 'Subject updated' : 'Subject created')
      setSubjectModal(false)
      setEditSubject(null)
    },
    onError: () => toast.error('Failed to save subject'),
  })

  const destroySubject = useMutation({
    mutationFn: (id: number) => api.delete(`/subjects/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.success('Subject deleted'); setDeleteSubject(null) },
    onError: () => toast.error('Cannot delete subject'),
  })

  const openCreateClass = () => { setClassForm(BLANK_CLASS); setEditClass(null); setClassModal(true) }
  const openEditClass = (c: Class) => {
    setClassForm({ name: c.name, grade_level: c.grade_level, section: c.section, academic_year: c.academic_year, capacity: String(c.capacity) })
    setEditClass(c)
    setClassModal(true)
  }

  const openCreateSubject = () => { setSubjectForm(BLANK_SUBJECT); setEditSubject(null); setSubjectModal(true) }
  const openEditSubject = (s: Subject) => {
    setSubjectForm({ name: s.name, code: s.code, description: s.description, assigned_class: s.assigned_class ? String(s.assigned_class) : '' })
    setEditSubject(s)
    setSubjectModal(true)
  }

  const classColumns = [
    { header: 'Name', accessor: 'name' as keyof Class },
    { header: 'Grade Level', accessor: 'grade_level' as keyof Class },
    { header: 'Section', render: (c: Class) => c.section || '—' },
    { header: 'Academic Year', accessor: 'academic_year' as keyof Class },
    {
      header: 'Capacity',
      render: (c: Class) => (
        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
          <span className="font-medium">{c.capacity}</span> students
        </span>
      ),
    },
    ...(canManage ? [{
      header: 'Actions',
      render: (c: Class) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEditClass(c)} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteClass(c)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }] : []),
  ]

  const subjectColumns = [
    {
      header: 'Subject',
      render: (s: Subject) => (
        <div>
          <div className="font-medium">{s.name}</div>
          <div className="text-xs text-gray-400 font-mono">{s.code}</div>
        </div>
      ),
    },
    {
      header: 'Description',
      render: (s: Subject) => <span className="text-sm text-gray-500">{s.description || '—'}</span>,
    },
    {
      header: 'Class',
      render: (s: Subject) =>
        s.assigned_class_detail
          ? <Badge color="purple">{s.assigned_class_detail.name}</Badge>
          : <span className="text-gray-400 text-xs italic">All Classes</span>,
    },
    ...(canManage ? [{
      header: 'Actions',
      render: (s: Subject) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEditSubject(s)} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteSubject(s)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    }] : []),
  ]

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Classes & Subjects</h1>
          <p className="mt-0.5 text-sm text-gray-500">{classes.length} classes · {subjects.length} subjects</p>
        </div>
        {canManage && (
          <Button
            className="min-h-[44px] w-full shrink-0 sm:w-auto"
            onClick={tab === 'classes' ? openCreateClass : openCreateSubject}
          >
            <Plus className="h-4 w-4" />
            {tab === 'classes' ? 'Add Class' : 'Add Subject'}
          </Button>
        )}
      </div>

      <div className="-mx-1 overflow-x-auto border-b border-gray-200">
        <div className="flex min-w-0 gap-0 px-1">
        {([
          { id: 'classes', label: 'Classes', Icon: School, count: classes.length },
          { id: 'subjects', label: 'Subjects', Icon: BookOpen, count: subjects.length },
        ] as const).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-5 ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.Icon className="w-4 h-4" />
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
        </div>
      </div>

      {tab === 'classes' && (
        <Card>
          <div className="min-w-0 overflow-x-auto">
            <Table columns={classColumns} data={classes} loading={classLoading} emptyMessage="No classes yet. Create your first class to get started." />
          </div>
        </Card>
      )}

      {tab === 'subjects' && (
        <Card>
          <div className="min-w-0 overflow-x-auto">
            <Table columns={subjectColumns} data={subjects} loading={subjectLoading} emptyMessage="No subjects yet." />
          </div>
        </Card>
      )}

      {/* Class Create/Edit Modal */}
      <Modal open={classModal} onClose={() => { setClassModal(false); setEditClass(null) }} title={editClass ? `Edit: ${editClass.name}` : 'Create Class'}>
        <form onSubmit={e => { e.preventDefault(); saveClass.mutate(classForm) }} className="space-y-4">
          <Input label="Class Name" placeholder="e.g. Grade 5A" value={classForm.name} onChange={e => setClassForm(p => ({ ...p, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Grade Level" placeholder="e.g. Grade 5" value={classForm.grade_level} onChange={e => setClassForm(p => ({ ...p, grade_level: e.target.value }))} required />
            <Input label="Section" placeholder="e.g. A (optional)" value={classForm.section} onChange={e => setClassForm(p => ({ ...p, section: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Academic Year" placeholder="e.g. 2025-2026" value={classForm.academic_year} onChange={e => setClassForm(p => ({ ...p, academic_year: e.target.value }))} required />
            <Input label="Capacity" type="number" min={1} value={classForm.capacity} onChange={e => setClassForm(p => ({ ...p, capacity: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setClassModal(false); setEditClass(null) }}>Cancel</Button>
            <Button type="submit" loading={saveClass.isPending}>{editClass ? 'Save Changes' : 'Create Class'}</Button>
          </div>
        </form>
      </Modal>

      {/* Subject Create/Edit Modal */}
      <Modal open={subjectModal} onClose={() => { setSubjectModal(false); setEditSubject(null) }} title={editSubject ? `Edit: ${editSubject.name}` : 'Create Subject'}>
        <form onSubmit={e => { e.preventDefault(); saveSubject.mutate({ ...subjectForm, assigned_class: subjectForm.assigned_class || null }) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Subject Name" placeholder="e.g. Mathematics" value={subjectForm.name} onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))} required />
            <Input label="Subject Code" placeholder="e.g. MATH-5" value={subjectForm.code} onChange={e => setSubjectForm(p => ({ ...p, code: e.target.value }))} required />
          </div>
          <Select label="Assign to Class (optional)" value={subjectForm.assigned_class} onChange={e => setSubjectForm(p => ({ ...p, assigned_class: e.target.value }))}>
            <option value="">— All Classes / Unassigned —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Textarea label="Description" placeholder="Brief description of the subject..." value={subjectForm.description} onChange={e => setSubjectForm(p => ({ ...p, description: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setSubjectModal(false); setEditSubject(null) }}>Cancel</Button>
            <Button type="submit" loading={saveSubject.isPending}>{editSubject ? 'Save Changes' : 'Create Subject'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Class Confirm */}
      <Modal open={!!deleteClass} onClose={() => setDeleteClass(null)} title="Delete Class" size="sm">
        <p className="text-sm text-gray-600 mb-5">
          Delete class <strong>{deleteClass?.name}</strong>? This cannot be undone and will fail if students are enrolled.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteClass(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteClass && destroyClass.mutate(deleteClass.id)} loading={destroyClass.isPending}>Delete</Button>
        </div>
      </Modal>

      {/* Delete Subject Confirm */}
      <Modal open={!!deleteSubject} onClose={() => setDeleteSubject(null)} title="Delete Subject" size="sm">
        <p className="text-sm text-gray-600 mb-5">Delete subject <strong>{deleteSubject?.name}</strong>?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteSubject(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteSubject && destroySubject.mutate(deleteSubject.id)} loading={destroySubject.isPending}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
