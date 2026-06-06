import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, Link2, Unlink } from 'lucide-react'
import toast from 'react-hot-toast'
import { Table } from '../../../components/ui/Table'
import { Badge } from '../../../components/ui/Badge'
import { Card, CardBody } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input, Select, Textarea } from '../../../components/ui/Input'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'

interface Student {
  id: number
  first_name: string
  last_name: string
  student_id: string
}

interface Parent {
  id: number
  user: { id: number; full_name: string; email: string }
  phone: string
  alternate_phone: string
  occupation: string
  address: string
  children: Student[]
}

const BLANK_CREATE = { first_name: '', last_name: '', email: '', password: '', phone: '', alternate_phone: '', occupation: '', address: '' }
const BLANK_EDIT = { phone: '', alternate_phone: '', occupation: '', address: '' }

export default function ParentsPage() {
  const { hasScope } = useAuth()
  const qc = useQueryClient()
  const canManage = hasScope('parents.manage') || hasScope('users.manage')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editParent, setEditParent] = useState<Parent | null>(null)
  const [deleteParent, setDeleteParent] = useState<Parent | null>(null)
  const [linkParent, setLinkParent] = useState<Parent | null>(null)
  const [createForm, setCreateForm] = useState(BLANK_CREATE)
  const [editForm, setEditForm] = useState(BLANK_EDIT)
  const [linkForm, setLinkForm] = useState({ student_id: '', relationship: 'guardian', is_primary: false })

  const { data, isLoading } = useQuery({
    queryKey: ['parents', search],
    queryFn: () => api.get('/parents/', { params: { search } }).then(r => r.data),
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students-minimal'],
    queryFn: () => api.get('/students/').then(r => r.data.results ?? r.data),
    enabled: !!linkParent,
  })

  const parents: Parent[] = data?.results ?? data ?? []
  const allStudents: Student[] = studentsData ?? []

  const createMutation = useMutation({
    mutationFn: (d: object) => api.post('/parents/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parents'] }); toast.success('Parent created'); setShowCreate(false); setCreateForm(BLANK_CREATE) },
    onError: (e: { response?: { data?: { email?: string[] } } }) => toast.error(e.response?.data?.email?.[0] ?? 'Failed to create parent'),
  })

  const editMutation = useMutation({
    mutationFn: (d: object) => api.patch(`/parents/${editParent!.id}/`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parents'] }); toast.success('Parent updated'); setEditParent(null) },
    onError: () => toast.error('Failed to update parent'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/parents/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parents'] }); toast.success('Parent deleted'); setDeleteParent(null) },
    onError: () => toast.error('Cannot delete parent'),
  })

  const linkMutation = useMutation({
    mutationFn: (d: object) => api.post(`/parents/${linkParent!.id}/link-student/`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parents'] }); toast.success('Student linked'); setLinkParent(null); setLinkForm({ student_id: '', relationship: 'guardian', is_primary: false }) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Failed to link student'),
  })

  const unlinkMutation = useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: number; studentId: number }) =>
      api.delete(`/parents/${parentId}/unlink-student/${studentId}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parents'] }); toast.success('Student unlinked') },
    onError: () => toast.error('Failed to unlink student'),
  })

  const openEdit = (p: Parent) => {
    setEditForm({ phone: p.phone, alternate_phone: p.alternate_phone, occupation: p.occupation, address: p.address })
    setEditParent(p)
  }

  const columns = [
    {
      header: 'Parent',
      render: (p: Parent) => (
        <div>
          <div className="font-medium">{p.user.full_name}</div>
          <div className="text-xs text-gray-400">{p.user.email}</div>
        </div>
      ),
    },
    { header: 'Phone', render: (p: Parent) => p.phone || '—' },
    {
      header: 'Children',
      render: (p: Parent) => (
        <div className="flex flex-wrap gap-1">
          {p.children.map(c => (
            <span key={c.id} className="group inline-flex items-center gap-1">
              <Badge color="blue">{c.first_name} {c.last_name}</Badge>
              {canManage && (
                <button
                  onClick={() => unlinkMutation.mutate({ parentId: p.id, studentId: c.id })}
                  title="Unlink"
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition"
                >
                  <Unlink className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          {p.children.length === 0 && <span className="text-gray-400 text-xs italic">No children linked</span>}
        </div>
      ),
    },
    ...(canManage ? [{
      header: 'Actions',
      render: (p: Parent) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => { setLinkParent(p); setLinkForm({ student_id: '', relationship: 'guardian', is_primary: false }) }} title="Link Student" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
            <Link2 className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteParent(p)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
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
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Parents</h1>
          <p className="mt-0.5 text-sm text-gray-500">{parents.length} total parents</p>
        </div>
        {canManage && (
          <Button className="min-h-[44px] w-full sm:w-auto" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add Parent</Button>
        )}
      </div>

      <Card>
        <CardBody>
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardBody>
        <div className="min-w-0 overflow-x-auto">
          <Table columns={columns} data={parents} loading={isLoading} emptyMessage="No parents found" />
        </div>
      </Card>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setCreateForm(BLANK_CREATE) }} title="Add Parent" size="lg">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(createForm) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={createForm.first_name} onChange={e => setCreateForm(p => ({ ...p, first_name: e.target.value }))} required />
            <Input label="Last Name" value={createForm.last_name} onChange={e => setCreateForm(p => ({ ...p, last_name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} required />
            <Input label="Password" type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))} />
            <Input label="Alternate Phone" value={createForm.alternate_phone} onChange={e => setCreateForm(p => ({ ...p, alternate_phone: e.target.value }))} />
          </div>
          <Input label="Occupation" value={createForm.occupation} onChange={e => setCreateForm(p => ({ ...p, occupation: e.target.value }))} />
          <Textarea label="Address" value={createForm.address} onChange={e => setCreateForm(p => ({ ...p, address: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create Parent</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editParent} onClose={() => setEditParent(null)} title={`Edit: ${editParent?.user.full_name}`} size="lg">
        <form onSubmit={e => { e.preventDefault(); editMutation.mutate(editForm) }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
            <Input label="Alternate Phone" value={editForm.alternate_phone} onChange={e => setEditForm(p => ({ ...p, alternate_phone: e.target.value }))} />
          </div>
          <Input label="Occupation" value={editForm.occupation} onChange={e => setEditForm(p => ({ ...p, occupation: e.target.value }))} />
          <Textarea label="Address" value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditParent(null)}>Cancel</Button>
            <Button type="submit" loading={editMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Link Student Modal */}
      <Modal open={!!linkParent} onClose={() => setLinkParent(null)} title={`Link Student → ${linkParent?.user.full_name}`} size="sm">
        <form
          onSubmit={e => {
            e.preventDefault()
            linkMutation.mutate({ student_id: Number(linkForm.student_id), relationship: linkForm.relationship, is_primary: linkForm.is_primary })
          }}
          className="space-y-4"
        >
          <Select label="Student" value={linkForm.student_id} onChange={e => setLinkForm(p => ({ ...p, student_id: e.target.value }))} required>
            <option value="">— Select Student —</option>
            {allStudents
              .filter(s => !linkParent?.children.some(c => c.id === s.id))
              .map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_id})</option>
              ))}
          </Select>
          <Select label="Relationship" value={linkForm.relationship} onChange={e => setLinkForm(p => ({ ...p, relationship: e.target.value }))}>
            {['father', 'mother', 'guardian', 'other'].map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={linkForm.is_primary} onChange={e => setLinkForm(p => ({ ...p, is_primary: e.target.checked }))} className="rounded" />
            <span>Primary guardian</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setLinkParent(null)}>Cancel</Button>
            <Button type="submit" loading={linkMutation.isPending}>Link Student</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteParent} onClose={() => setDeleteParent(null)} title="Delete Parent" size="sm">
        <p className="text-sm text-gray-600 mb-5">
          Delete <strong>{deleteParent?.user.full_name}</strong>? This will also remove their user account and all child links.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteParent(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteParent && deleteMutation.mutate(deleteParent.id)} loading={deleteMutation.isPending}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
