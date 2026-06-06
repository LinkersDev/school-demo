import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, FolderOpen, FileDown, Loader2, LayoutGrid } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Input, Select, Textarea } from '../../../components/ui/Input'
import { formatDate } from '../../../utils/format'
import {
  downloadLessonPlanDocx,
  downloadLessonPlanPdf,
  type LessonPlanExportSource,
} from '../../../utils/lessonPlanExport'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'
import type { ClassRow, FormState, LessonPlan } from '../lessonPlanShared'
import {
  BLANK_FORM,
  CREATE_DRAFT_STORAGE_KEY,
  ExplorerShell,
  ProgressBar,
  buildClassSubjectOptions,
  clearStoredDraft,
  fetchAllPagesForClass,
  fetchAllSubjectsPages,
  getDraftStorageKey,
  lessonPlanStatusProgress,
  loadRecentPicks,
  loadStoredDraft,
  optionsFromLessonPlans,
  planToForm,
  pushRecentPick,
  saveStoredDraft,
  sectionLabel,
  subjectIdFromPlan,
  unwrapResults,
  type ClassSubjectOption,
  type RecentClassSubjectPick,
} from '../lessonPlanShared'
import SmartPickerModal from '../components/SmartPickerModal'
import LessonPlanTable from '../components/LessonPlanTable'

function planToExportSource(row: LessonPlan): LessonPlanExportSource {
  const { label } = lessonPlanStatusProgress(row.status)
  return {
    title: row.title,
    objectives: row.objectives,
    activities: row.activities,
    materials: row.materials,
    className: row.class_detail?.name ?? '—',
    subjectName: row.subject_detail?.name ?? '—',
    weekRange: row.week_start
      ? `${formatDate(row.week_start)}${row.week_end ? ` – ${formatDate(row.week_end)}` : ''}`
      : '—',
    status: row.status,
    statusLabel: label,
  }
}

export default function LessonPlansPage() {
  const { hasScope, user } = useAuth()
  const roleName = user?.role ?? ''
  const qc = useQueryClient()
  const [sp, setSp] = useSearchParams()
  const classId = sp.get('class')
  const subjectId = sp.get('subject')

  const [pickerOpen, setPickerOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editPlan, setEditPlan] = useState<LessonPlan | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [form, setForm] = useState<FormState>(BLANK_FORM)
  const [localSaveState, setLocalSaveState] = useState('')
  const [exportingId, setExportingId] = useState<number | null>(null)
  const [exportKind, setExportKind] = useState<'pdf' | 'docx' | null>(null)

  const LIST_PAGE = 500
  const userKey = String(user?.id ?? 'guest')

  const { data: classes = [], isLoading: clsLoading } = useQuery({
    queryKey: ['classes', 'lp-explorer'],
    queryFn: () =>
      api
        .get<ClassRow[]>('/classes/', { params: { page_size: LIST_PAGE } })
        .then((r) => unwrapResults<ClassRow>(r.data)),
  })

  const { data: subjectsAll = [], isLoading: subAllLoading } = useQuery({
    queryKey: ['subjects', 'lp-explorer-all-pages'],
    queryFn: fetchAllSubjectsPages,
  })

  const { data: plansForClass = [], isLoading: plansLoading } = useQuery({
    queryKey: ['lesson-plans', 'class', classId],
    enabled: Boolean(classId),
    queryFn: () => fetchAllPagesForClass(classId!),
  })

  const basePickerOptions = useMemo(
    () => buildClassSubjectOptions(classes, subjectsAll),
    [classes, subjectsAll],
  )

  const pickerOptions = useMemo(() => {
    const byKey = new Map<string, ClassSubjectOption>()
    for (const o of basePickerOptions) {
      byKey.set(`${o.classId}-${o.subjectId}`, o)
    }
    for (const x of optionsFromLessonPlans(plansForClass)) {
      const k = `${x.classId}-${x.subjectId}`
      if (!byKey.has(k)) {
        byKey.set(k, {
          ...x,
          searchBlob:
            `${x.className} ${x.gradeLevel} ${x.subjectName}`.toLowerCase().trim() || x.searchBlob,
        })
      }
    }
    return Array.from(byKey.values()).sort((a, b) =>
      `${a.className} ${a.subjectName}`.localeCompare(`${b.className} ${b.subjectName}`, undefined, {
        sensitivity: 'base',
      }),
    )
  }, [basePickerOptions, plansForClass])

  const plans = useMemo(() => {
    if (!subjectId) return []
    return plansForClass.filter((p) => subjectIdFromPlan(p) === String(subjectId))
  }, [plansForClass, subjectId])

  const { data: subjectsForForm } = useQuery({
    queryKey: ['subjects', 'all-options', LIST_PAGE],
    queryFn: () =>
      api
        .get('/subjects/', { params: { page_size: LIST_PAGE } })
        .then((r) => unwrapResults<{ id: number; name: string }>(r.data)),
  })

  const [recentSnapshot, setRecentSnapshot] = useState<RecentClassSubjectPick[]>([])

  useEffect(() => {
    setRecentSnapshot(loadRecentPicks(userKey))
  }, [userKey, classId, subjectId])

  useEffect(() => {
    if (clsLoading || subAllLoading || pickerOptions.length === 0) return
    const valid =
      Boolean(classId) &&
      Boolean(subjectId) &&
      pickerOptions.some((o) => String(o.classId) === classId && String(o.subjectId) === subjectId)
    if (valid) return
    const recents = loadRecentPicks(userKey)
    const fromRecent = recents
      .map((r) => pickerOptions.find((o) => o.classId === r.classId && o.subjectId === r.subjectId))
      .find(Boolean)
    const pick = fromRecent ?? pickerOptions[0]
    setSp({ class: String(pick.classId), subject: String(pick.subjectId) }, { replace: true })
  }, [clsLoading, subAllLoading, pickerOptions, classId, subjectId, setSp, userKey])

  useEffect(() => {
    const storedCreateDraft = loadStoredDraft(CREATE_DRAFT_STORAGE_KEY)
    if (storedCreateDraft) {
      setForm(storedCreateDraft)
      toast.success('Draft recovered successfully')
    }
  }, [])

  useEffect(() => {
    if (!showModal) return
    const key = getDraftStorageKey(editPlan?.id)
    saveStoredDraft(key, form)
    setLocalSaveState('Saved locally')
  }, [form, showModal, editPlan?.id])

  const selectedPair = useMemo(() => {
    if (!classId || !subjectId) return null
    return (
      pickerOptions.find((o) => String(o.classId) === classId && String(o.subjectId) === subjectId) ?? null
    )
  }, [pickerOptions, classId, subjectId])

  const onPickExplorer = (o: ClassSubjectOption) => {
    setSp({ class: String(o.classId), subject: String(o.subjectId) }, { replace: true })
    pushRecentPick(userKey, { classId: o.classId, subjectId: o.subjectId })
    setRecentSnapshot(loadRecentPicks(userKey))
  }

  const completeExplorerPick = (o: ClassSubjectOption) => {
    onPickExplorer(o)
    setPickerOpen(false)
  }

  const saveDraft = useMutation({
    mutationFn: (payload: object) =>
      editPlan
        ? api.patch(`/lesson-plans/${editPlan.id}/`, payload)
        : api.post('/lesson-plans/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-plans'] })
      clearStoredDraft(getDraftStorageKey(editPlan?.id))
      toast.success(editPlan ? 'Draft updated' : 'Draft saved')
      setShowModal(false)
      setEditPlan(null)
      setForm(BLANK_FORM)
      setLocalSaveState('')
    },
    onError: () => toast.error(editPlan ? 'Failed to update draft' : 'Failed to save draft'),
  })

  const submit = useMutation({
    mutationFn: (id: number) => api.post(`/lesson-plans/${id}/submit/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-plans'] })
      toast.success('Submitted for approval')
    },
  })

  const approve = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/lesson-plans/${id}/approve/`, { action: 'approved', comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-plans'] })
      qc.invalidateQueries({ queryKey: ['dashboard-coordinator'] })
      qc.invalidateQueries({ queryKey: ['dashboard-admin'] })
      qc.invalidateQueries({ queryKey: ['dashboard-lesson-plans'] })
      toast.success('Approved')
      setSelectedPlan(null)
    },
    onError: () => toast.error('Approval failed'),
  })

  const reject = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/lesson-plans/${id}/reject/`, { action: 'rejected', comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-plans'] })
      qc.invalidateQueries({ queryKey: ['dashboard-coordinator'] })
      qc.invalidateQueries({ queryKey: ['dashboard-admin'] })
      qc.invalidateQueries({ queryKey: ['dashboard-lesson-plans'] })
      toast.success('Rejected')
      setSelectedPlan(null)
    },
    onError: () => toast.error('Rejection failed'),
  })

  const canManage = hasScope('lessonplans.manage')

  const canApproveSelected =
    selectedPlan &&
    ((roleName === 'coordinator' && selectedPlan.status === 'submitted') ||
      (roleName === 'admin' &&
        (selectedPlan.status === 'submitted' || selectedPlan.status === 'coordinator_approved')))

  const runExport = async (row: LessonPlan, kind: 'pdf' | 'docx') => {
    setExportingId(row.id)
    setExportKind(kind)
    try {
      const payload = planToExportSource(row)
      if (kind === 'pdf') {
        downloadLessonPlanPdf(payload)
      } else {
        await downloadLessonPlanDocx(payload)
      }
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingId(null)
      setExportKind(null)
    }
  }

  const openCreateModal = () => {
    setEditPlan(null)
    const base = loadStoredDraft(CREATE_DRAFT_STORAGE_KEY) ?? BLANK_FORM
    setForm({
      ...base,
      assigned_class: classId || base.assigned_class,
      subject: subjectId || base.subject,
    })
    setLocalSaveState('')
    setShowModal(true)
  }

  const openEditModal = (plan: LessonPlan) => {
    const key = getDraftStorageKey(plan.id)
    const storedDraft = loadStoredDraft(key)
    setEditPlan(plan)
    setForm(storedDraft ?? planToForm(plan))
    setLocalSaveState(storedDraft ? 'Recovered local draft' : '')
    if (storedDraft) toast.success('Draft recovered successfully')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditPlan(null)
    setLocalSaveState('')
  }

  const draftPayload = useMemo(
    () => ({
      ...form,
      draft_data: form,
      subject: Number(form.subject),
      assigned_class: Number(form.assigned_class),
      week_start: form.week_start || null,
      week_end: form.week_end || null,
    }),
    [form],
  )

  const onTitleActivate = (p: LessonPlan) => {
    if (canManage && p.status === 'draft') {
      openEditModal(p)
      return
    }
    if (
      hasScope('lessonplans.approve') &&
      (p.status === 'submitted' || p.status === 'coordinator_approved')
    ) {
      setSelectedPlan(p)
      setApprovalComment('')
    }
  }

  const newPlanButton = canManage ? (
    <Button
      onClick={openCreateModal}
      className="shrink-0 border-indigo-200/70 bg-indigo-600 text-white shadow-md shadow-indigo-900/20 hover:bg-indigo-700"
    >
      <Plus className="h-4 w-4" /> New plan
    </Button>
  ) : null

  const pageBody = (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/30 px-5 py-5 shadow-md shadow-indigo-900/10 backdrop-blur-md sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="hidden shrink-0 rounded-xl bg-indigo-600 p-2.5 text-white shadow-md shadow-indigo-900/20 ring-2 ring-indigo-400/25 sm:flex">
              <FolderOpen className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-indigo-950 sm:text-2xl">Lesson plans explorer</h1>
              <p className="mt-1 text-xs text-indigo-900/75 sm:text-sm">
                Search for a class and subject in one step, then review or edit plans for that group.
              </p>
            </div>
          </div>
          {newPlanButton}
        </div>
      </section>

      <div className="space-y-3">
        <h2 className={sectionLabel}>Class &amp; subject</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="border-indigo-200/80 bg-white/90 text-indigo-900 shadow-sm backdrop-blur-sm hover:bg-white"
          >
            <LayoutGrid className="h-4 w-4" />
            Select class &amp; subject
          </Button>
        </div>
        {selectedPair ? (
          <div className="flex flex-col gap-2 rounded-xl border border-white/50 bg-white/40 px-4 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-800/80">Selected</span>
              <p className="text-sm font-semibold text-indigo-950">
                {selectedPair.className} → {selectedPair.subjectName}
                {selectedPair.gradeLevel ? (
                  <span className="ml-2 font-normal text-indigo-800/75">({selectedPair.gradeLevel})</span>
                ) : null}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 border-indigo-200/70"
              onClick={() => setPickerOpen(true)}
            >
              Change selection
            </Button>
          </div>
        ) : (
          <p className="text-sm text-indigo-800/70">Choose a class and subject to load lesson plans.</p>
        )}
      </div>

      <SmartPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mode="full"
        loading={clsLoading || subAllLoading}
        options={pickerOptions}
        recentPicks={recentSnapshot}
        onSelect={completeExplorerPick}
        selectedClassId={classId ? Number(classId) : null}
        selectedSubjectId={subjectId ? Number(subjectId) : null}
      />

      {classId && subjectId ? (
        <div>
          <h2 className={`mb-3 ${sectionLabel}`}>Lesson plans</h2>
          {!plansLoading && plans.length === 0 ? (
            <div className="rounded-xl border border-white/50 bg-white/50 px-6 py-12 text-center shadow-sm backdrop-blur-sm">
              <p className="text-sm font-medium text-indigo-900">No lesson plans yet</p>
              {canManage ? (
                <Button
                  type="button"
                  className="mt-4 border-indigo-200/70 bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={openCreateModal}
                >
                  <Plus className="h-4 w-4" /> Create new plan
                </Button>
              ) : null}
            </div>
          ) : (
            <LessonPlanTable
              data={plans}
              loading={plansLoading}
              canManage={canManage}
              canApprove={hasScope('lessonplans.approve')}
              submitPending={submit.isPending}
              onTitleClick={onTitleActivate}
              onEditDraft={openEditModal}
              onSubmit={(row) => submit.mutate(row.id)}
              onOpenReview={(row) => {
                setSelectedPlan(row)
                setApprovalComment('')
              }}
            />
          )}
        </div>
      ) : null}

      <Modal open={showModal} onClose={closeModal} title={editPlan ? `Edit Draft: ${editPlan.title}` : 'Create lesson plan'} size="xl">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveDraft.mutate(draftPayload)
          }}
          className="space-y-4"
        >
          <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Subject"
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              required
            >
              <option value="">-- Subject --</option>
              {(subjectsForForm ?? []).map((s: { id: number; name: string }) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              label="Class"
              value={form.assigned_class}
              onChange={(e) => setForm((p) => ({ ...p, assigned_class: e.target.value }))}
              required
            >
              <option value="">-- Class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Objectives"
            rows={3}
            value={form.objectives}
            onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))}
            required
          />
          <Textarea
            label="Activities"
            rows={3}
            value={form.activities}
            onChange={(e) => setForm((p) => ({ ...p, activities: e.target.value }))}
            required
          />
          <Textarea
            label="Materials"
            rows={2}
            value={form.materials}
            onChange={(e) => setForm((p) => ({ ...p, materials: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Week Start"
              type="date"
              value={form.week_start}
              onChange={(e) => setForm((p) => ({ ...p, week_start: e.target.value }))}
            />
            <Input
              label="Week End"
              type="date"
              value={form.week_end}
              onChange={(e) => setForm((p) => ({ ...p, week_end: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-2">
            <div className="text-xs text-gray-400">{localSaveState || 'Saving locally as you type'}</div>
            <div className="flex gap-2">
              <Button variant="secondary" type="button" onClick={closeModal}>
                Close
              </Button>
              <Button type="submit" loading={saveDraft.isPending}>
                <Save className="w-4 h-4" />
                {editPlan ? 'Save Draft Changes' : 'Save as Draft'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        title={`Review: ${selectedPlan?.title ?? ''}`}
        size="2xl"
      >
        {selectedPlan ? (
          <div className="flex max-h-[min(78vh,40rem)] flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="min-w-0 text-sm text-gray-700">
                  <p>
                    {[selectedPlan.class_detail?.name ?? '—', selectedPlan.subject_detail?.name ?? '—'].join(' · ')}
                  </p>
                  <p className="mt-0.5">
                    <span className="text-gray-500">Teacher:</span> {selectedPlan.teacher_name || '—'}
                  </p>
                  {selectedPlan.week_start ? (
                    <p className="mt-0.5 text-gray-600">
                      Week {formatDate(selectedPlan.week_start)}
                      {selectedPlan.week_end ? ` – ${formatDate(selectedPlan.week_end)}` : ''}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={exportingId === selectedPlan.id}
                    onClick={() => void runExport(selectedPlan, 'pdf')}
                  >
                    {exportingId === selectedPlan.id && exportKind === 'pdf' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
                    PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={exportingId === selectedPlan.id}
                    onClick={() => void runExport(selectedPlan, 'docx')}
                  >
                    {exportingId === selectedPlan.id && exportKind === 'docx' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="h-3.5 w-3.5" />
                    )}
                    Word
                  </Button>
                </div>
              </div>
              {(() => {
                const { pct, label } = lessonPlanStatusProgress(selectedPlan.status)
                return (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-700">Status</div>
                    <div className="text-xs text-gray-600">{label}</div>
                    <ProgressBar pct={pct} />
                  </div>
                )
              })()}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">Objectives</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {(selectedPlan.objectives || '').trim() || '—'}
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">Activities</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {(selectedPlan.activities || '').trim() || '—'}
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">Materials</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {(selectedPlan.materials || '').trim() || '—'}
                </p>
              </div>
            </div>
            <div className="shrink-0 space-y-4 border-t border-gray-100 pt-4">
              <Textarea
                label="Comment (optional)"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={3}
              />
              <div className="flex gap-3">
                {canApproveSelected ? (
                  <Button
                    className="flex-1"
                    onClick={() => approve.mutate({ id: selectedPlan.id, comment: approvalComment })}
                    loading={approve.isPending}
                  >
                    Approve
                  </Button>
                ) : null}
                <Button
                  variant="danger"
                  className={canApproveSelected ? 'flex-1' : 'w-full'}
                  onClick={() => reject.mutate({ id: selectedPlan.id, comment: approvalComment })}
                  loading={reject.isPending}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )

  return <ExplorerShell>{pageBody}</ExplorerShell>
}
