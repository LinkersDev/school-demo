import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, Power } from 'lucide-react'
import toast from 'react-hot-toast'
import { Table } from '../components/ui/Table'
import { Card, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { formatDate } from '../utils/format'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'

interface Role {
  id: number
  name: string
}

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: Role | null
  is_active: boolean
  date_joined: string
}

const ROLE_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'gray'> = {
  admin: 'blue',
  teacher: 'green',
  coordinator: 'purple',
  parent: 'orange',
}

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role_id: '',
  is_active: true,
}

export default function UsersPage() {
  const qc = useQueryClient()
  const currentUser = useAuthStore(s => s.user)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  // ── data ─────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () =>
      api.get('/users/', { params: { search: search || undefined, role: roleFilter || undefined } })
        .then(r => r.data),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles/').then(r => r.data),
  })

  const users: User[] = data?.results ?? data ?? []
  const roles: Role[] = rolesData?.results ?? rolesData ?? []

  // ── mutations ─────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (d: object) => api.post('/users/', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
      setShowCreate(false)
      setForm({ ...emptyForm })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.email?.[0] ?? err?.response?.data?.detail ?? 'Failed to create user'
      toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => api.patch(`/users/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
      setEditUser(null)
    },
    onError: () => toast.error('Failed to update user'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
      setDeleteUser(null)
    },
    onError: () => toast.error('Failed to delete user'),
  })

  const toggleActive = useMutation({
    mutationFn: (id: number) => api.post(`/users/${id}/toggle-active/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: () => toast.error('Failed to update status'),
  })

  // ── helpers ───────────────────────────────────────────────────────────
  const openEdit = (u: User) => {
    setEditUser(u)
    setForm({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      password: '',
      role_id: u.role ? String(u.role.id) : '',
      is_active: u.is_active,
    })
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      role_id: form.role_id ? Number(form.role_id) : null,
    })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    const payload: Record<string, unknown> = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      role_id: form.role_id ? Number(form.role_id) : null,
      is_active: form.is_active,
    }
    if (form.password) payload.password = form.password
    updateMutation.mutate({ id: editUser.id, data: payload })
  }

  // ── table columns ─────────────────────────────────────────────────────
  const columns = [
    {
      header: 'User',
      render: (u: User) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {u.first_name[0]?.toUpperCase()}{u.last_name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">{u.full_name}</div>
            <div className="text-xs text-gray-400">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      render: (u: User) =>
        u.role
          ? <Badge color={ROLE_COLORS[u.role.name] ?? 'gray'}>{u.role.name.replace('_', ' ')}</Badge>
          : <span className="text-gray-300 text-xs">— no role —</span>,
    },
    {
      header: 'Status',
      render: (u: User) => (
        <Badge color={u.is_active ? 'green' : 'red'}>
          {u.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    { header: 'Joined', render: (u: User) => formatDate(u.date_joined) },
    {
      header: 'Actions',
      render: (u: User) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(u)}
            title="Edit user"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleActive.mutate(u.id)}
            title={u.is_active ? 'Deactivate' : 'Activate'}
            className={`p-1.5 rounded-lg transition ${
              u.is_active
                ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            }`}
          >
            <Power className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteUser(u)}
            title="Delete user"
            disabled={u.id === currentUser?.id}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  // ── render ────────────────────────────────────────────────────────────
  return (
    <div className="min-w-0 space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">User Management</h1>
          <p className="mt-0.5 text-sm text-gray-500">{users.length} total users</p>
        </div>
        <Button
          className="min-h-[44px] w-full shrink-0 sm:w-auto"
          onClick={() => { setForm({ ...emptyForm }); setShowCreate(true) }}
        >
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative min-w-0 flex-1 sm:min-w-[12rem]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto sm:min-w-[10rem]"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </CardBody>
        <div className="min-w-0 overflow-x-auto">
          <Table columns={columns} data={users} loading={isLoading} emptyMessage="No users found" />
        </div>
      </Card>

      {/* ── Create Modal ─────────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New User" size="lg">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="First Name"
              value={form.first_name}
              onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
              required
            />
            <Input
              label="Last Name"
              value={form.last_name}
              onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
              required
            />
          </div>
          <Input
            label="Email Address"
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            required
          />
          <Select
            label="Role"
            value={form.role_id}
            onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))}
          >
            <option value="">— No Role —</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>
            ))}
          </Select>

          <RoleScopesHint roleId={form.role_id} roles={roles} rolesData={rolesData} />

          <div className="flex items-center gap-2 pt-1">
            <input
              id="create-active"
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="create-active" className="text-sm text-gray-700">Active account</label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create User</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Modal ───────────────────────────────────────────────── */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit: ${editUser?.full_name}`} size="lg">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="First Name"
              value={form.first_name}
              onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
              required
            />
            <Input
              label="Last Name"
              value={form.last_name}
              onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
              required
            />
          </div>
          <Input
            label="Email Address"
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            placeholder="Leave blank to keep current password"
          />
          <Select
            label="Role"
            value={form.role_id}
            onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))}
          >
            <option value="">— No Role —</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>
            ))}
          </Select>

          <RoleScopesHint roleId={form.role_id} roles={roles} rolesData={rolesData} />

          <div className="flex items-center gap-2 pt-1">
            <input
              id="edit-active"
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="edit-active" className="text-sm text-gray-700">Active account</label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ───────────────────────────────────────────── */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="Delete User" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-gray-900">{deleteUser?.full_name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={deleteMutation.isPending}
              onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}

// ── Inline scope hint when a role is selected ─────────────────────────
function RoleScopesHint({
  roleId, rolesData,
}: {
  roleId: string
  roles?: Role[]
  rolesData: any
}) {
  if (!roleId) return null
  const allRoles = rolesData?.results ?? rolesData ?? []
  const selected = allRoles.find((r: any) => String(r.id) === roleId)
  if (!selected?.scopes?.length) return null

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
      <p className="text-xs font-semibold text-blue-700 mb-2">
        Permissions granted ({selected.scopes.length} scopes):
      </p>
      <div className="flex flex-wrap gap-1.5">
        {selected.scopes.map((s: string) => (
          <span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-mono">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}
