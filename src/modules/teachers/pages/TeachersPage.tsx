import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, Power } from 'lucide-react'
import toast from 'react-hot-toast'
import { Table } from '../../../components/ui/Table'
import { Badge } from '../../../components/ui/Badge'
import { Card, CardBody } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input, Select } from '../../../components/ui/Input'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'

interface Teacher {
  id: number
  employee_id: string
  user: { id: number; full_name: string; email: string }
  subjects: number[]
  subjects_detail: { id: number; name: string }[]
  classes: number[]
  classes_detail: { id: number; name: string }[]
  phone: string
  qualification: string
  specialization: string
  joined_date: string | null
  is_active: boolean
}

const BLANK_CREATE = {
  first_name: '', last_name: '', email: '', password: '',
  phone: '', qualification: '', specialization: '',
  subjects: [] as number[], classes: [] as number[], joined_date: '',
}

const BLANK_EDIT = {
  employee_id: '', phone: '', qualification: '', specialization: '',
  subjects: [] as number[], classes: [] as number[], joined_date: '', is_active: true,
}

export default function TeachersPage() {
  const { hasScope } = useAuth()
  const qc = useQueryClient()
  const canManage = hasScope('teachers.manage') || hasScope('users.manage')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null)
  const [createForm, setCreateForm] = useState(BLANK_CREATE)
  const [editForm, setEditForm] = useState(BLANK_EDIT)

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', search],
    queryFn: () => api.get('/teachers/', { params: { search } }).then(r => r.data),
  })
  const { data: classesData } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes/').then(r => r.data.results ?? r.data) })
  const { data: subjectsData } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/subjects/').then(r => r.data.results ?? r.data) })

  const teachers: Teacher[] = data?.results ?? data ?? []
  const classes: { id: number; name: string }[] = classesData ?? []
  const subjects: { id: number; name: string }[] = subjectsData ?? []

  const createMutation = useMutation({
    mutationFn: (d: object) => api.post('/teachers/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); toast.success('Teacher created'); setShowCreate(false); setCreateForm(BLANK_CREATE) },
    onError: (e: { response?: { data?: { email?: string[] } } }) => toast.error(e.response?.data?.email?.[0] ?? 'Failed to create teacher'),
  })

  const editMutation = useMutation({
    mutationFn: (d: object) => api.patch(`/teachers/${editTeacher!.id}/`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); toast.success('Teacher updated'); setEditTeacher(null) },
    onError: () => toast.error('Failed to update teacher'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/teachers/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); toast.success('Teacher deleted'); setDeleteTeacher(null) },
    onError: () => toast.error('Cannot delete teacher'),
  })

  const toggleActive = useMutation({
    mutationFn: (t: Teacher) => api.patch(`/teachers/${t.id}/`, { is_active: !t.is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }) },
    onError: () => toast.error('Failed to update status'),
  })

  const openEdit = (t: Teacher) => {
    setEditForm({
      employee_id: t.employee_id,
      phone: t.phone,
      qualification: t.qualification,
      specialization: t.specialization,
      subjects: t.subjects,
      classes: t.classes,
      joined_date: t.joined_date ?? '',
      is_active: t.is_active,
    })
    setEditTeacher(t)
  }

  const toggleMulti = (list: number[], id: number) =>
    list.includes(id) ? list.filter(x => x !== id) : [...list, id]

  const columns = [
    {
      header: 'Teacher',
      render: (t: Teacher) => (
        <div>
          <div className="font-medium">{t.user.full_name}</div>
          <div className="text-xs text-gray-400">{t.user.email}</div>
        </div>
      ),
    },
    { header: 'Employee ID', render: (t: Teacher) => <span className="font-mono text-sm">{t.employee_id}</span> },
    {
      header: 'Subjects',
      render: (t: Teacher) => (
        <div className="flex flex-wrap gap-1">
          {t.subjects_detail.map(s => <Badge key={s.id} color="blue">{s.name}</Badge>)}
          {t.subjects_detail.length === 0 && <span className="text-gray-400 text-xs">—</span>}
        </div>
      ),
    },
    {
      header: 'Classes',
      render: (t: Teacher) => (
        <div className="flex flex-wrap gap-1">
          {t.classes_detail.map(c => <Badge key={c.id} color="purple">{c.name}</Badge>)}
          {t.classes_detail.length === 0 && <span className="text-gray-400 text-xs">—</span>}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (t: Teacher) => <Badge color={t.is_active ? 'green' : 'red'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    ...(canManage ? [{
      header: 'Actions',
      render: (t: Teacher) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(t)} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleActive.mutate(t)}
            title={t.is_active ? 'Deactivate' : 'Activate'}
            className={`p-1.5 rounded-lg transition ${t.is_active ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
          >
            <Power className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteTeacher(t)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
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
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Teachers</h1>
          <p className="mt-0.5 text-sm text-gray-500">{teachers.length} total teachers</p>
        </div>
        {canManage && (
          <Button className="min-h-[44px] w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add Teacher</Button>
        )}
      </div>

      <Card>
        <CardBody>
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search by name or employee ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardBody>
        <div className="min-w-0 overflow-x-auto">
          <Table columns={columns} data={teachers} loading={isLoading} emptyMessage="No teachers found" />
        </div>
      </Card>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setCreateForm(BLANK_CREATE) }} title="Add Teacher" size="lg">
        <form
          onSubmit={e => {
            e.preventDefault()
            createMutation.mutate({
              ...createForm,
              joined_date: createForm.joined_date || null,
            })
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={createForm.first_name} onChange={e => setCreateForm(p => ({ ...p, first_name: e.target.value }))} required />
            <Input label="Last Name" value={createForm.last_name} onChange={e => setCreateForm(p => ({ ...p, last_name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} required />
            <Input label="Password" type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Employee ID" value="Auto-generated" disabled />
            <Input label="Phone" value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Qualification" placeholder="e.g. B.Ed" value={createForm.qualification} onChange={e => setCreateForm(p => ({ ...p, qualification: e.target.value }))} />
            <Input label="Specialization" value={createForm.specialization} onChange={e => setCreateForm(p => ({ ...p, specialization: e.target.value }))} />
          </div>
          <Input label="Joining Date" type="date" value={createForm.joined_date} onChange={e => setCreateForm(p => ({ ...p, joined_date: e.target.value }))} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classes</label>
              <div className="border border-gray-300 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                {classes.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                    <input type="checkbox" checked={createForm.classes.includes(c.id)} onChange={() => setCreateForm(p => ({ ...p, classes: toggleMulti(p.classes, c.id) }))} className="rounded" />
                    {c.name}
                  </label>
                ))}
                {classes.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No classes yet</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subjects</label>
              <div className="border border-gray-300 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                {subjects.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                    <input type="checkbox" checked={createForm.subjects.includes(s.id)} onChange={() => setCreateForm(p => ({ ...p, subjects: toggleMulti(p.subjects, s.id) }))} className="rounded" />
                    {s.name}
                  </label>
                ))}
                {subjects.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No subjects yet</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create Teacher</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTeacher} onClose={() => setEditTeacher(null)} title={`Edit: ${editTeacher?.user.full_name}`} size="lg">
        <form onSubmit={e => { e.preventDefault(); editMutation.mutate({ ...editForm, joined_date: editForm.joined_date || null }) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Employee ID" value={editForm.employee_id} onChange={e => setEditForm(p => ({ ...p, employee_id: e.target.value }))} required />
            <Input label="Phone" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Qualification" value={editForm.qualification} onChange={e => setEditForm(p => ({ ...p, qualification: e.target.value }))} />
            <Input label="Specialization" value={editForm.specialization} onChange={e => setEditForm(p => ({ ...p, specialization: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Joining Date" type="date" value={editForm.joined_date} onChange={e => setEditForm(p => ({ ...p, joined_date: e.target.value }))} />
            <Select label="Status" value={String(editForm.is_active)} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.value === 'true' }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classes</label>
              <div className="border border-gray-300 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                {classes.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                    <input type="checkbox" checked={editForm.classes.includes(c.id)} onChange={() => setEditForm(p => ({ ...p, classes: toggleMulti(p.classes, c.id) }))} className="rounded" />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subjects</label>
              <div className="border border-gray-300 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
                {subjects.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                    <input type="checkbox" checked={editForm.subjects.includes(s.id)} onChange={() => setEditForm(p => ({ ...p, subjects: toggleMulti(p.subjects, s.id) }))} className="rounded" />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditTeacher(null)}>Cancel</Button>
            <Button type="submit" loading={editMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTeacher} onClose={() => setDeleteTeacher(null)} title="Delete Teacher" size="sm">
        <p className="text-sm text-gray-600 mb-5">
          Delete <strong>{deleteTeacher?.user.full_name}</strong>? This will also remove their user account.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTeacher(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteTeacher && deleteMutation.mutate(deleteTeacher.id)} loading={deleteMutation.isPending}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
