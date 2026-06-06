import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bus, MapPin, Phone, User, Search, Plus, Pencil, Users, UserX, Armchair } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { Card, CardBody, StatCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { usePermission } from '../hooks/usePermission'
import { cn } from '../utils/cn'

interface BusRoute {
  id: number
  name: string
  driver_name: string
  driver_phone: string
  area_description: string
  capacity: number
  is_active: boolean
  notes: string
  assigned_count?: number
}

interface BusStats {
  total_routes: number
  active_routes: number
  inactive_routes: number
  total_capacity_active: number
  students_on_bus: number
  students_not_on_bus: number
  total_active_students: number
  seats_available: number
  by_route: { id: number; name: string; capacity: number; assigned: number; available: number }[]
}

interface StudentRow {
  id: number
  student_id: string
  first_name: string
  last_name: string
  full_name: string
  assigned_class_detail?: { id: number; name: string; grade_level?: string } | null
  bus_route: number | null
  bus_route_detail?: { id: number; name: string } | null
  bus_pickup_point: string
  bus_morning_pickup: string
}

const fieldCls = cn(
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition',
  'border-gray-300 text-gray-900 hover:border-blue-300',
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/35',
)

export default function TransportationPage() {
  const qc = useQueryClient()
  const { canAny } = usePermission()
  const canEdit = canAny('transport.manage', 'students.manage')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'routes' | 'students'>('routes')
  const [routeModal, setRouteModal] = useState<{ mode: 'add' } | { mode: 'edit'; route: BusRoute } | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['bus-stats'],
    queryFn: () => api.get<BusStats>('/transport/bus-routes/stats/').then(r => r.data),
  })

  const { data: routesRes, isFetching: routesLoading } = useQuery({
    queryKey: ['bus-routes'],
    queryFn: () =>
      api
        .get<{ results?: BusRoute[] } | BusRoute[]>('/transport/bus-routes/', { params: { page_size: 200 } })
        .then(r => {
          const raw = r.data
          return Array.isArray(raw) ? raw : raw.results ?? []
        }),
  })
  const routes: BusRoute[] = routesRes ?? []

  const { data: studentsRes, isFetching: studentsLoading } = useQuery({
    queryKey: ['students', 'transport'],
    queryFn: () =>
      api
        .get<{ results?: StudentRow[] } | StudentRow[]>('/students/', { params: { page_size: 500, is_active: true } })
        .then(r => {
          const raw = r.data
          return Array.isArray(raw) ? raw : raw.results ?? []
        }),
  })
  const students: StudentRow[] = studentsRes ?? []

  const createRoute = useMutation({
    mutationFn: (body: Partial<BusRoute>) => api.post('/transport/bus-routes/', body),
    onSuccess: () => {
      toast.success('Bus route created')
      qc.invalidateQueries({ queryKey: ['bus-routes'] })
      qc.invalidateQueries({ queryKey: ['bus-stats'] })
      setRouteModal(null)
    },
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      toast.error(e.response?.data?.detail ?? 'Could not create route'),
  })

  const patchRoute = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<BusRoute> }) =>
      api.patch(`/transport/bus-routes/${id}/`, body),
    onSuccess: () => {
      toast.success('Route updated')
      qc.invalidateQueries({ queryKey: ['bus-routes'] })
      qc.invalidateQueries({ queryKey: ['bus-stats'] })
      setRouteModal(null)
    },
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      toast.error(e.response?.data?.detail ?? 'Could not update route'),
  })

  const assignMutation = useMutation({
    mutationFn: (payload: {
      student: number
      bus_route: number | null
      bus_pickup_point: string
      bus_morning_pickup: string
    }) => api.post('/transport/bus-assignments/', payload),
    onSuccess: () => {
      toast.success('Assignment saved')
      qc.invalidateQueries({ queryKey: ['students', 'transport'] })
      qc.invalidateQueries({ queryKey: ['bus-routes'] })
      qc.invalidateQueries({ queryKey: ['bus-stats'] })
    },
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      toast.error(e.response?.data?.detail ?? 'Assignment failed'),
  })

  const [drafts, setDrafts] = useState<
    Record<number, { bus_route: string; bus_pickup_point: string; bus_morning_pickup: string }>
  >({})

  const getDraft = (s: StudentRow) =>
    drafts[s.id] ?? {
      bus_route: s.bus_route ? String(s.bus_route) : '',
      bus_pickup_point: s.bus_pickup_point ?? '',
      bus_morning_pickup: s.bus_morning_pickup ?? '',
    }

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter(
      s =>
        !q ||
        s.full_name?.toLowerCase().includes(q) ||
        s.student_id?.toLowerCase().includes(q) ||
        s.assigned_class_detail?.name?.toLowerCase().includes(q) ||
        s.bus_route_detail?.name?.toLowerCase().includes(q),
    )
  }, [students, search])

  const [formName, setFormName] = useState('')
  const [formDriver, setFormDriver] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formArea, setFormArea] = useState('')
  const [formCapacity, setFormCapacity] = useState('40')
  const [formActive, setFormActive] = useState(true)
  const [formNotes, setFormNotes] = useState('')

  const openAddModal = () => {
    setFormName('')
    setFormDriver('')
    setFormPhone('')
    setFormArea('')
    setFormCapacity('40')
    setFormActive(true)
    setFormNotes('')
    setRouteModal({ mode: 'add' })
  }

  const openEditModal = (route: BusRoute) => {
    setFormName(route.name)
    setFormDriver(route.driver_name ?? '')
    setFormPhone(route.driver_phone ?? '')
    setFormArea(route.area_description ?? '')
    setFormCapacity(String(route.capacity ?? 40))
    setFormActive(route.is_active)
    setFormNotes(route.notes ?? '')
    setRouteModal({ mode: 'edit', route })
  }

  const submitRouteForm = () => {
    const capacity = parseInt(formCapacity, 10) || 40
    const body = {
      name: formName.trim(),
      driver_name: formDriver.trim(),
      driver_phone: formPhone.trim(),
      area_description: formArea.trim(),
      capacity,
      is_active: formActive,
      notes: formNotes.trim(),
    }
    if (!body.name) {
      toast.error('Route name is required')
      return
    }
    if (routeModal?.mode === 'add') createRoute.mutate(body)
    else if (routeModal?.mode === 'edit') patchRoute.mutate({ id: routeModal.route.id, body })
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-xl border border-blue-100/80 bg-gradient-to-br from-white to-blue-50/50 p-4 shadow-sm ring-1 ring-blue-100/60">
        <h1 className="text-xl font-bold text-blue-950 sm:text-2xl">Transportation</h1>
        <p className="mt-0.5 text-sm text-blue-900/70">
          Bus routes, capacity, and per-student assignments. Statistics update as you assign riders.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active routes" value={stats?.active_routes ?? '—'} icon={Bus} color="blue" />
        <StatCard title="Students on a bus" value={stats?.students_on_bus ?? '—'} icon={Users} color="blue" />
        <StatCard title="Not assigned" value={stats?.students_not_on_bus ?? '—'} icon={UserX} color="blue" sub="active students" />
        <StatCard title="Seats available" value={stats?.seats_available ?? '—'} icon={Armchair} color="blue" sub="on active routes" />
      </div>

      {stats && stats.total_active_students > 0 && (
        <Card className="border-blue-100/80">
          <CardBody className="py-3">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <span className="text-blue-950/80">
                <strong>{stats.students_on_bus}</strong> of{' '}
                <strong>{stats.total_active_students}</strong> active students use bus service (
                {Math.round((stats.students_on_bus / stats.total_active_students) * 100)}%)
              </span>
              <span className="text-gray-500">
                Total capacity (active routes): <strong>{stats.total_capacity_active}</strong>
              </span>
              {stats.inactive_routes > 0 && (
                <span className="text-amber-700">{stats.inactive_routes} inactive route(s) — not counted in capacity</span>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-blue-100 bg-blue-50/50 p-1">
          {(['routes', 'students'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-medium transition-all capitalize',
                activeTab === tab
                  ? 'bg-white text-blue-900 shadow-sm ring-1 ring-blue-200/80'
                  : 'text-blue-800/70 hover:text-blue-950',
              )}
            >
              {tab === 'routes' ? 'Bus routes' : 'Assign students'}
            </button>
          ))}
        </div>
        {canEdit && activeTab === 'routes' && (
          <Button type="button" size="sm" className="shadow-sm" onClick={openAddModal}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add route
          </Button>
        )}
      </div>

      {activeTab === 'routes' && (
        <div>
          {routesLoading ? (
            <Card>
              <CardBody className="py-10 text-center text-sm text-gray-500">Loading routes…</CardBody>
            </Card>
          ) : routes.length === 0 ? (
            <Card className="border-blue-100">
              <CardBody className="py-14 text-center text-sm text-blue-900/70">
                No bus routes yet. {canEdit ? 'Add a route to get started.' : 'An administrator can add routes.'}
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {routes.map(route => {
                const assigned = route.assigned_count ?? 0
                const fillPct = route.capacity > 0 ? Math.round((assigned / route.capacity) * 100) : 0
                const fillColor =
                  fillPct >= 90 ? 'bg-red-400' : fillPct >= 70 ? 'bg-amber-400' : 'bg-blue-500'
                return (
                  <Card key={route.id} className={cn('border-blue-100/80', route.is_active ? '' : 'opacity-70')}>
                    <CardBody>
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                              route.is_active ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-200 text-gray-500',
                            )}
                          >
                            <Bus className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-blue-950">{route.name}</p>
                            {route.area_description ? (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-blue-900/60">
                                <MapPin className="h-3 w-3" /> {route.area_description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-semibold',
                              route.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
                            )}
                          >
                            {route.is_active ? 'active' : 'inactive'}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(route)}
                              className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-100"
                              aria-label="Edit route"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-700">
                        {route.driver_name ? (
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-blue-500" />
                            <span>{route.driver_name}</span>
                          </div>
                        ) : null}
                        {route.driver_phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-blue-500" />
                            <span>{route.driver_phone}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Riders / capacity</span>
                          <span className="font-medium text-gray-800">
                            {assigned} / {route.capacity}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div className={cn('h-full rounded-full transition-all', fillColor)} style={{ width: `${fillPct}%` }} />
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <Card className="border-blue-100/80">
          <CardBody className="border-b border-gray-100 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-blue-950">All students — bus assignment</h3>
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-400" />
                <input
                  type="search"
                  placeholder="Search name, ID, class, or route…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={cn(fieldCls, 'pl-9')}
                />
              </div>
            </div>
          </CardBody>
          <div className="overflow-x-auto">
            {studentsLoading ? (
              <p className="p-6 text-sm text-gray-500">Loading students…</p>
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-blue-100 bg-blue-50/80">
                  <tr>
                    {['Student', 'Class', 'Route', 'Pickup point', 'Morning time', ''].map(h => (
                      <th
                        key={h || 'actions'}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-blue-900/70"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map(s => {
                    const d = getDraft(s)
                    return (
                      <tr key={s.id} className="bg-white hover:bg-blue-50/40">
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {s.full_name ?? `${s.first_name} ${s.last_name}`}
                          <span className="ml-1 text-xs font-normal text-gray-500">{s.student_id}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{s.assigned_class_detail?.name ?? '—'}</td>
                        <td className="px-4 py-2">
                          <select
                            value={d.bus_route}
                            disabled={!canEdit}
                            onChange={e =>
                              setDrafts(prev => ({
                                ...prev,
                                [s.id]: { ...getDraft(s), bus_route: e.target.value },
                              }))
                            }
                            className={cn(fieldCls, 'min-w-[8rem] py-1.5')}
                          >
                            <option value="">— No bus —</option>
                            {routes
                              .filter(r => r.is_active)
                              .map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            disabled={!canEdit}
                            value={d.bus_pickup_point}
                            onChange={e =>
                              setDrafts(prev => ({
                                ...prev,
                                [s.id]: { ...getDraft(s), bus_pickup_point: e.target.value },
                              }))
                            }
                            placeholder="e.g. Main gate"
                            className={cn(fieldCls, 'min-w-[7rem] py-1.5')}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            disabled={!canEdit}
                            value={d.bus_morning_pickup}
                            onChange={e =>
                              setDrafts(prev => ({
                                ...prev,
                                [s.id]: { ...getDraft(s), bus_morning_pickup: e.target.value },
                              }))
                            }
                            placeholder="e.g. 7:15"
                            className={cn(fieldCls, 'w-24 py-1.5')}
                          />
                        </td>
                        <td className="px-4 py-2">
                          {canEdit && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="border-blue-200 text-blue-800 hover:bg-blue-50"
                              loading={assignMutation.isPending}
                              disabled={
                                d.bus_route === (s.bus_route ? String(s.bus_route) : '') &&
                                d.bus_pickup_point === (s.bus_pickup_point ?? '') &&
                                d.bus_morning_pickup === (s.bus_morning_pickup ?? '')
                              }
                              onClick={() =>
                                assignMutation.mutate({
                                  student: s.id,
                                  bus_route: d.bus_route ? Number(d.bus_route) : null,
                                  bus_pickup_point: d.bus_pickup_point,
                                  bus_morning_pickup: d.bus_morning_pickup,
                                })
                              }
                            >
                              Save
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                        {students.length === 0 ? 'No students in your view.' : 'No matches.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          {!canEdit && (
            <CardBody className="border-t border-blue-50 bg-blue-50/40 py-3">
              <p className="text-xs text-blue-900/80">
                You have read-only access. Staff with transport permission can assign buses.
              </p>
            </CardBody>
          )}
        </Card>
      )}

      {routeModal && (
        <Modal
          open={Boolean(routeModal)}
          title={routeModal.mode === 'add' ? 'Add bus route' : 'Edit bus route'}
          onClose={() => setRouteModal(null)}
        >
          <div className="space-y-3 p-1">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Route name</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. North loop" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Driver name</label>
                <Input value={formDriver} onChange={e => setFormDriver(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Driver phone</label>
                <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Area / coverage</label>
              <Input value={formArea} onChange={e => setFormArea(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Capacity</label>
                <Input value={formCapacity} onChange={e => setFormCapacity(e.target.value)} type="number" min={1} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} />
                  Active route
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Notes</label>
              <textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={2}
                className={fieldCls}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setRouteModal(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                loading={createRoute.isPending || patchRoute.isPending}
                onClick={submitRouteForm}
              >
                {routeModal.mode === 'add' ? 'Create' : 'Save'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
