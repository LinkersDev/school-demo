import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, FileText, BarChart3, ImagePlus, Send, LayoutGrid } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Input, Textarea } from '../../../components/ui/Input'
import { validateHomeworkImageFile } from '../../../utils/homeworkUpload'
import { SCHOOL_NAME_EXPORT } from '../../../constants/school'
import { useAuth } from '../../../hooks/useAuth'
import SmartPickerModal from '../components/SmartPickerModal'
import api from '../../../services/api'
import { Card, CardBody } from '../../../components/ui/Card'
import { TeacherWorkspaceShell } from '../../../components/teacher/TeacherWorkspaceShell'
import { cn } from '../../../utils/cn'
import type { ClassRow, FormState, LessonPlan } from '../lessonPlanShared'
import {
  BLANK_FORM,
  CREATE_DRAFT_STORAGE_KEY,
  buildClassSubjectOptions,
  fetchAllPagesForClass,
  fetchAllSubjectsPages,
  loadRecentPicks,
  loadStoredDraft,
  optionsFromLessonPlans,
  planToForm,
  saveStoredDraft,
  clearStoredDraft,
  getDraftStorageKey,
  sectionLabel,
  subjectIdFromPlan,
  unwrapResults,
  pushRecentPick,
  type ClassSubjectOption,
  type RecentClassSubjectPick,
} from '../lessonPlanShared'

const formCardClass =
  'border-white/50 bg-white/80 shadow-sm shadow-indigo-900/5 backdrop-blur-sm'

export default function TeacherLessonPlansPage() {
  const navigate = useNavigate()
  const { hasScope, user } = useAuth()
  const qc = useQueryClient()
  const [sp, setSp] = useSearchParams()
  const classId = sp.get('class')
  const subjectId = sp.get('subject')

  const [editPlan, setEditPlan] = useState<LessonPlan | null>(null)
  const [form, setForm] = useState<FormState>(BLANK_FORM)
  const [localSaveState, setLocalSaveState] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [recentSnapshot, setRecentSnapshot] = useState<RecentClassSubjectPick[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const LIST_PAGE = 500
  const userKey = String(user?.id ?? 'guest')

  const { data: classes = [], isLoading: clsLoading } = useQuery({
    queryKey: ['classes', 'lp-teacher'],
    queryFn: () =>
      api
        .get<ClassRow[]>('/classes/', { params: { page_size: LIST_PAGE } })
        .then((r) => unwrapResults<ClassRow>(r.data)),
  })

  const { data: subjectsAll = [], isLoading: subAllLoading } = useQuery({
    queryKey: ['subjects', 'lp-teacher-all-pages'],
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

  const onPickTeacher = (o: ClassSubjectOption) => {
    setSp({ class: String(o.classId), subject: String(o.subjectId) }, { replace: true })
    pushRecentPick(userKey, { classId: o.classId, subjectId: o.subjectId })
    setRecentSnapshot(loadRecentPicks(userKey))
    setPickerOpen(false)
  }

  const selectedTeacherPair = useMemo(() => {
    if (!classId || !subjectId) return null
    return pickerOptions.find((o) => String(o.classId) === classId && String(o.subjectId) === subjectId) ?? null
  }, [pickerOptions, classId, subjectId])

  useEffect(() => {
    if (!classId || !subjectId) return
    setEditPlan(null)
    const stored = loadStoredDraft(CREATE_DRAFT_STORAGE_KEY)
    if (stored && String(stored.assigned_class) === classId && String(stored.subject) === subjectId) {
      setForm(stored)
      if ((stored.title || '').trim() || (stored.objectives || '').trim()) {
        toast.success('Draft recovered')
      }
    } else {
      setForm({ ...BLANK_FORM, assigned_class: classId, subject: subjectId })
    }
  }, [classId, subjectId])

  useEffect(() => {
    if (!classId || !subjectId) return
    const key = getDraftStorageKey(editPlan?.id)
    saveStoredDraft(key, form)
    setLocalSaveState('Saved locally')
  }, [form, editPlan?.id, classId, subjectId])

  const saveDraft = useMutation({
    mutationFn: (payload: FormData | object) =>
      editPlan
        ? api.patch(`/lesson-plans/${editPlan.id}/`, payload)
        : api.post('/lesson-plans/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-plans'] })
      qc.invalidateQueries({ queryKey: ['lesson-plans', 'teacher-history'] })
      clearStoredDraft(getDraftStorageKey(editPlan?.id))
      toast.success(editPlan ? 'Draft updated' : 'Draft saved')
      setEditPlan(null)
      setAttachment(null)
      if (classId && subjectId) {
        setForm({ ...BLANK_FORM, assigned_class: classId, subject: subjectId })
      } else {
        setForm(BLANK_FORM)
      }
      setLocalSaveState('')
    },
    onError: () => toast.error(editPlan ? 'Failed to update draft' : 'Failed to save draft'),
  })

  const canManage = hasScope('lessonplans.manage')

  const submit = useMutation({
    mutationFn: (id: number) => api.post(`/lesson-plans/${id}/submit/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson-plans'] })
      qc.invalidateQueries({ queryKey: ['lesson-plans', 'teacher-history'] })
      toast.success('Submitted for approval')
      setEditPlan(null)
      if (classId && subjectId) {
        setForm({ ...BLANK_FORM, assigned_class: classId, subject: subjectId })
      }
    },
  })

  const openEdit = (plan: LessonPlan) => {
    const key = getDraftStorageKey(plan.id)
    const storedDraft = loadStoredDraft(key)
    setEditPlan(plan)
    setAttachment(null)
    setForm(storedDraft ?? planToForm(plan))
    setLocalSaveState(storedDraft ? 'Recovered local draft' : '')
    if (storedDraft) toast.success('Draft recovered successfully')
  }

  const startNewPlanForContext = () => {
    setEditPlan(null)
    setAttachment(null)
    clearStoredDraft(CREATE_DRAFT_STORAGE_KEY)
    if (classId && subjectId) {
      setForm({ ...BLANK_FORM, assigned_class: classId, subject: subjectId })
    } else {
      setForm(BLANK_FORM)
    }
    setLocalSaveState('')
    toast.success('Starting a new plan — fill the form below')
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

  const persistDraft = () => {
    if (!canManage) return
    if (attachment) {
      const err = validateHomeworkImageFile(attachment)
      if (err) {
        toast.error(err)
        return
      }
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('objectives', form.objectives)
      fd.append('activities', form.activities)
      fd.append('materials', form.materials)
      fd.append('subject', String(draftPayload.subject))
      fd.append('assigned_class', String(draftPayload.assigned_class))
      if (form.week_start) fd.append('week_start', form.week_start)
      if (form.week_end) fd.append('week_end', form.week_end)
      fd.append('draft_data', JSON.stringify(draftPayload.draft_data))
      fd.append('attachment', attachment)
      saveDraft.mutate(fd)
    } else {
      saveDraft.mutate(draftPayload)
    }
  }

  const openEditParam = sp.get('openEdit')

  useEffect(() => {
    if (!openEditParam || !classId || !subjectId) return
    const id = Number(openEditParam)
    if (Number.isNaN(id)) return
    if (plansLoading) return
    const plan = plansForClass.find((p) => p.id === id)
    if (!plan || subjectIdFromPlan(plan) !== String(subjectId)) return
    openEdit(plan)
    const next = new URLSearchParams(sp)
    next.delete('openEdit')
    setSp(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when openEdit URL or plans load
  }, [openEditParam, classId, subjectId, plansLoading, plansForClass])

  const pickerBlock = (
    <>
      <div className="space-y-3 rounded-xl border border-white/45 bg-white/30 p-3 sm:p-4">
        <div className={sectionLabel}>Class &amp; subject</div>
        <Button
          type="button"
          variant="secondary"
          className="w-full border-indigo-200/80 bg-white/90 text-indigo-900 shadow-sm sm:w-auto"
          onClick={() => setPickerOpen(true)}
        >
          <LayoutGrid className="h-4 w-4" />
          Select class &amp; subject
        </Button>
        {selectedTeacherPair ? (
          <div className="flex flex-col gap-2 rounded-xl border border-indigo-200/40 bg-white/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-800/75">Selected</span>
              <p className="text-sm font-semibold text-indigo-950">
                {selectedTeacherPair.className} → {selectedTeacherPair.subjectName}
                {selectedTeacherPair.gradeLevel ? (
                  <span className="ml-2 font-normal text-indigo-800/70">({selectedTeacherPair.gradeLevel})</span>
                ) : null}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
              Change selection
            </Button>
          </div>
        ) : (
          <p className="text-xs text-indigo-800/70">Select a class and subject to edit your plan.</p>
        )}
      </div>
      <SmartPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mode="full"
        loading={clsLoading || subAllLoading}
        options={pickerOptions}
        recentPicks={recentSnapshot}
        onSelect={onPickTeacher}
        selectedClassId={classId ? Number(classId) : null}
        selectedSubjectId={subjectId ? Number(subjectId) : null}
      />
    </>
  )

  const formCard = classId && subjectId && (
    <Card
      className={cn(formCardClass, 'flex min-h-[280px] flex-1 flex-col overflow-hidden lg:min-h-0')}
    >
      <CardBody className="shrink-0 space-y-2 border-b border-indigo-100/80 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className={sectionLabel}>Lesson plan</h2>
            <p className="text-xs text-indigo-800/70">
              {editPlan ? `Editing: ${editPlan.title}` : 'New draft for this class and subject.'}
            </p>
          </div>
          {canManage && editPlan?.status === 'draft' && (
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 border-teal-200/70 text-teal-900"
              loading={submit.isPending}
              onClick={() => submit.mutate(editPlan.id)}
            >
              <Send className="h-4 w-4" />
              Submit for approval
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={startNewPlanForContext}
          className="text-left text-xs font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
        >
          Clear form / new plan
        </button>
      </CardBody>
      <CardBody className="min-h-0 flex-1 overflow-y-auto">
        <form
          id="teacher-lesson-plan-form"
          onSubmit={(e) => {
            e.preventDefault()
            persistDraft()
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(9rem,11rem)_minmax(9rem,11rem)] md:items-end">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />
            <Input
              label="Week start"
              type="date"
              value={form.week_start}
              onChange={(e) => setForm((p) => ({ ...p, week_start: e.target.value }))}
            />
            <Input
              label="Week end"
              type="date"
              value={form.week_end}
              onChange={(e) => setForm((p) => ({ ...p, week_end: e.target.value }))}
            />
          </div>
          <div className="rounded-lg border border-teal-200/45 bg-teal-50/25 p-3 shadow-sm backdrop-blur-sm sm:p-3.5">
            <label className={`mb-1.5 block ${sectionLabel} text-teal-900/90`}>
              Upload picture (optional)
            </label>
            <p className="mb-2 text-[10px] text-teal-800/75 sm:text-xs">
              Max 2MB · JPEG, PNG, WebP, or GIF · Adds an attachment to this lesson plan
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-teal-300/80 bg-white/90 px-4 py-2.5 text-sm font-medium text-teal-900 transition hover:border-teal-400 hover:bg-teal-50/60">
                <ImagePlus className="h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                Choose image to upload
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    if (!f) {
                      setAttachment(null)
                      return
                    }
                    const err = validateHomeworkImageFile(f)
                    if (err) {
                      toast.error(err)
                      e.target.value = ''
                      return
                    }
                    setAttachment(f)
                  }}
                />
              </label>
              {attachment && <span className="text-xs text-teal-800/75">{attachment.name}</span>}
              {editPlan?.attachment && !attachment && (
                <span className="text-xs text-teal-800/65">Existing file kept unless you replace it.</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-5">
            <Textarea
              label="Objectives"
              rows={4}
              value={form.objectives}
              onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))}
              required
            />
            <Textarea
              label="Activities"
              rows={4}
              value={form.activities}
              onChange={(e) => setForm((p) => ({ ...p, activities: e.target.value }))}
              required
            />
          </div>
          <Textarea
            label="Materials"
            rows={3}
            value={form.materials}
            onChange={(e) => setForm((p) => ({ ...p, materials: e.target.value }))}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100/80 pt-3">
            <div className="text-xs text-indigo-700/60">{localSaveState || 'Saving locally as you type'}</div>
            <Button type="submit" loading={saveDraft.isPending} disabled={!canManage}>
              <Save className="h-4 w-4" />
              {editPlan ? 'Save draft changes' : 'Save as draft'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )

  return (
    <TeacherWorkspaceShell
      variant="compact"
      bodyClassName="min-h-0 flex-1 flex-col gap-3"
      title="My lesson plans"
      subtitle="Search your class and subject, then write your plan. Open History to browse, preview, and export saved plans."
      heroIcon={FileText}
      heroActions={
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 border-indigo-200/70 bg-white/70 text-indigo-900 shadow-sm backdrop-blur-sm"
          onClick={() => navigate('/my-lesson-plans/history')}
        >
          <BarChart3 className="h-4 w-4" aria-hidden />
          History and stats
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-6xl space-y-2">
        {pickerBlock}
        <p className="text-center text-xs text-indigo-800/65">
          {SCHOOL_NAME_EXPORT}
        </p>
      </div>
      {!classes.length && !clsLoading ? (
        <p className="text-sm text-indigo-700/70">No classes assigned.</p>
      ) : null}
      {classId && subjectId ? (
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">{formCard}</div>
      ) : (
        <p className="text-sm text-indigo-700/70">Select a class and subject to continue.</p>
      )}
    </TeacherWorkspaceShell>
  )
}
