import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Table } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'

interface AssessmentType {
  id: number
  name: string
  term: 'TERM_1' | 'TERM_2'
  order: number
  max_score: number
  scoring_mode: 'numeric' | 'functional'
  applicable_grade_levels: string[]
  is_active: boolean
  has_scores: boolean
  created_by_name: string
}

const TERM_LABELS: Record<string, string> = { TERM_1: 'Term 1', TERM_2: 'Term 2' }

interface AssessmentTypeForm {
  name: string
  term: string
  order: string
  max_score: string
  scoring_mode: 'numeric' | 'functional'
  grade_levels: string
}

const BLANK: AssessmentTypeForm = {
  name: '',
  term: 'TERM_1',
  order: '1',
  max_score: '100',
  scoring_mode: 'numeric',
  grade_levels: '',
}

export default function AssessmentTypesPage() {
  const { hasScope } = useAuth()
  const qc = useQueryClient()
  const canManage = hasScope('grades.manage')

  const [filterTerm, setFilterTerm] = useState('')
  const [filterActive, setFilterActive] = useState('true')
  const [modal, setModal] = useState(false)
  const [editAt, setEditAt] = useState<AssessmentType | null>(null)
  const [form, setForm] = useState<AssessmentTypeForm>(BLANK)
  const [disableTarget, setDisableTarget] = useState<AssessmentType | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['assessment-types', filterTerm, filterActive],
    queryFn: () =>
      api.get('/assessment-types/', {
        params: {
          ...(filterTerm && { term: filterTerm }),
          ...(filterActive !== '' && { is_active: filterActive }),
        },
      }).then(r => r.data.results ?? r.data),
  })

  const list: AssessmentType[] = data ?? []

  const save = useMutation({
    mutationFn: (d: object) =>
      editAt
        ? api.patch(`/assessment-types/${editAt.id}/`, d)
        : api.post('/assessment-types/', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-types'] })
      toast.success(editAt ? 'Assessment updated' : 'Assessment created')
      closeModal()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.max_score?.[0]
        ?? err?.response?.data?.non_field_errors?.[0]
        ?? 'Failed to save'
      toast.error(msg)
    },
  })

  const disable = useMutation({
    mutationFn: (id: number) => api.patch(`/assessment-types/${id}/disable/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessment-types'] })
      toast.success('Assessment disabled')
      setDisableTarget(null)
    },
    onError: () => toast.error('Failed to disable'),
  })

  const openCreate = () => {
    setForm({ ...BLANK })
    setEditAt(null)
    setModal(true)
  }

  const openEdit = (at: AssessmentType) => {
    setForm({
      name: at.name,
      term: at.term,
      order: String(at.order),
      max_score: String(at.max_score),
      scoring_mode: at.scoring_mode === 'functional' ? 'functional' : 'numeric',
      grade_levels: (at.applicable_grade_levels ?? []).join(', '),
    })
    setEditAt(at)
    setModal(true)
  }

  const closeModal = () => {
    setModal(false)
    setEditAt(null)
  }

  const columns = [
    {
      header: 'Assessment',
      render: (at: AssessmentType) => (
        <div>
          <div className="font-medium text-gray-900">{at.name}</div>
          <div className="text-xs text-gray-400">Order: {at.order}</div>
        </div>
      ),
    },
    {
      header: 'Term',
      render: (at: AssessmentType) => (
        <Badge color={at.term === 'TERM_1' ? 'blue' : 'purple'}>
          {TERM_LABELS[at.term]}
        </Badge>
      ),
    },
    {
      header: 'Max Score',
      render: (at: AssessmentType) => (
        <span className="font-mono font-semibold text-gray-800">{at.max_score}</span>
      ),
    },
    {
      header: 'Scoring',
      render: (at: AssessmentType) => (
        <span className="text-xs font-medium text-gray-700">
          {at.scoring_mode === 'functional' ? 'Functional' : 'Numeric'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (at: AssessmentType) =>
        at.is_active ? (
          <Badge color="green">Active</Badge>
        ) : (
          <Badge color="red">Disabled</Badge>
        ),
    },
    {
      header: 'Has Scores',
      render: (at: AssessmentType) => (
        <span className={`text-xs font-medium ${at.has_scores ? 'text-amber-600' : 'text-gray-400'}`}>
          {at.has_scores ? 'Yes — locked' : 'No'}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            header: 'Actions',
            render: (at: AssessmentType) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(at)}
                  title="Edit"
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {at.is_active && (
                  <button
                    onClick={() => setDisableTarget(at)}
                    title="Disable"
                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="min-w-0 space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Assessment Settings</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Define dynamic assessments — changes reflect immediately in teacher grade entry
          </p>
        </div>
        {canManage && (
          <Button className="min-h-[44px] w-full sm:w-auto" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Assessment
          </Button>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <strong>How it works:</strong> Each assessment you define here automatically appears as a
        column in the teacher grade entry screen. Disable instead of delete to preserve existing
        scores.
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <select
          value={filterTerm}
          onChange={e => setFilterTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
        >
          <option value="">All Terms</option>
          <option value="TERM_1">Term 1</option>
          <option value="TERM_2">Term 2</option>
        </select>
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
        >
          <option value="true">Active only</option>
          <option value="false">Disabled only</option>
          <option value="">All</option>
        </select>
      </div>

      <Card>
        <div className="min-w-0 overflow-x-auto">
          <Table
            columns={columns}
            data={list}
            loading={isLoading}
            emptyMessage="No assessment types yet. Create your first one."
          />
        </div>
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        open={modal}
        onClose={closeModal}
        title={editAt ? `Edit: ${editAt.name}` : 'Add Assessment Type'}
        size="sm"
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            if (!form.name.trim()) return toast.error('Name is required')
            if (Number(form.max_score) <= 0) return toast.error('Max score must be positive')
            const levels = form.grade_levels
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
            save.mutate({
              name: form.name.trim(),
              term: form.term,
              order: Number(form.order),
              max_score: Number(form.max_score),
              scoring_mode: form.scoring_mode,
              applicable_grade_levels: levels,
            })
          }}
          className="space-y-4"
        >
          <Input
            label="Assessment Name"
            placeholder="e.g. Assessment 1"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Term"
              value={form.term}
              onChange={e => setForm(p => ({ ...p, term: e.target.value }))}
            >
              <option value="TERM_1">Term 1</option>
              <option value="TERM_2">Term 2</option>
            </Select>
            <Input
              label="Order (column position)"
              type="number"
              min={1}
              value={form.order}
              onChange={e => setForm(p => ({ ...p, order: e.target.value }))}
              required
            />
          </div>
          <Input
            label="Max Score"
            type="number"
            min={1}
            value={form.max_score}
            onChange={e => setForm(p => ({ ...p, max_score: e.target.value }))}
            required
          />
          <Select
            label="Scoring mode"
            value={form.scoring_mode}
            onChange={e =>
              setForm(p => ({ ...p, scoring_mode: e.target.value as 'numeric' | 'functional' }))
            }
          >
            <option value="numeric">Numeric</option>
            <option value="functional">Functional (KG / skills)</option>
          </Select>
          <Input
            label="Applicable grade levels (optional)"
            placeholder="e.g. KG, 1, 2 — leave empty for all grades"
            value={form.grade_levels}
            onChange={e => setForm(p => ({ ...p, grade_levels: e.target.value }))}
          />
          {editAt?.has_scores && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              This assessment has existing scores. Changing Max Score is not allowed.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editAt ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Disable Confirm */}
      <Modal
        open={!!disableTarget}
        onClose={() => setDisableTarget(null)}
        title="Disable Assessment"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-5">
          Disable <strong>{disableTarget?.name}</strong>? It will no longer appear in teacher grade
          entry screens. Existing scores are preserved.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDisableTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => disableTarget && disable.mutate(disableTarget.id)}
            loading={disable.isPending}
          >
            Disable
          </Button>
        </div>
      </Modal>
    </div>
  )
}
