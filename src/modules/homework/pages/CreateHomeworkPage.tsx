import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, BookOpen, ImagePlus, BarChart3 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input, Select, Textarea } from '../../../components/ui/Input'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'
import { validateHomeworkImageFile } from '../../../utils/homeworkUpload'
import { formatDate } from '../../../utils/format'
import { SCHOOL_NAME_EXPORT } from '../../../constants/school'

interface HomeworkDetail {
  id: number
  title: string
  description: string
  subject: number
  assigned_class: number
  due_date: string
  status: string
  attachment_url: string | null
}

const emptyForm = {
  title: '',
  description: '',
  subject: '',
  assigned_class: '',
  due_date: '',
}

const hwPanel =
  'rounded-xl border border-white/55 bg-white/45 p-4 shadow-sm backdrop-blur-sm sm:p-5'
const hwLabelIndigo =
  'text-[10px] font-semibold uppercase tracking-wider text-indigo-800/90 sm:text-xs'
const hwLabelTeal =
  'text-[10px] font-semibold uppercase tracking-wider text-teal-900/85 sm:text-xs'
const hwInput =
  'border-indigo-200/60 bg-white/80 text-indigo-950 shadow-sm placeholder:text-indigo-400/50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/25'
const hwTextarea =
  'min-h-[220px] lg:min-h-[280px] border-indigo-200/60 bg-white/80 text-indigo-950 shadow-sm placeholder:text-indigo-400/50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/25'
const hwSelect =
  'border-teal-200/65 bg-white/85 text-teal-950 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-400/25'
const hwDate = hwSelect
const hwBtnSecondary =
  'border-indigo-200/70 bg-white/65 text-indigo-900 shadow-sm backdrop-blur-sm hover:bg-indigo-50/85 focus:ring-indigo-400'
const hwBtnDraft =
  'border-teal-200/65 bg-white/65 text-teal-900 shadow-sm backdrop-blur-sm hover:bg-teal-50/80 focus:ring-teal-400'
const hwBtnPublish =
  'bg-indigo-600 text-white shadow-md shadow-indigo-900/20 hover:bg-indigo-700 focus:ring-indigo-500'

export default function CreateHomeworkPage() {
  const { id } = useParams<{ id: string }>()
  const editId = id ? Number(id) : null
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasScope, user } = useAuth()
  const canManage = hasScope('homework.manage')

  const [form, setForm] = useState(emptyForm)
  const [attachment, setAttachment] = useState<File | null>(null)

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes/').then((r) => r.data.results ?? r.data),
    enabled: canManage,
  })
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects/').then((r) => r.data.results ?? r.data),
    enabled: canManage,
  })

  const { data: existing, isLoading: loadingHw } = useQuery({
    queryKey: ['homework', editId],
    queryFn: () => api.get<HomeworkDetail>(`/homeworks/${editId}/`).then((r) => r.data),
    enabled: canManage && editId != null && !Number.isNaN(editId),
  })

  useEffect(() => {
    if (!existing) return
    setForm({
      title: existing.title,
      description: existing.description,
      subject: String(existing.subject),
      assigned_class: String(existing.assigned_class),
      due_date: existing.due_date,
    })
  }, [existing])

  const className = useMemo(() => {
    if (!form.assigned_class) return null
    const c = (classes ?? []).find((x: { id: number }) => String(x.id) === form.assigned_class)
    return c?.name ?? null
  }, [classes, form.assigned_class])

  const subjectName = useMemo(() => {
    if (!form.subject) return null
    const s = (subjects ?? []).find((x: { id: number }) => String(x.id) === form.subject)
    return s?.name ?? null
  }, [subjects, form.subject])

  const dueLabel = useMemo(() => {
    if (!form.due_date) return null
    try {
      return formatDate(form.due_date)
    } catch {
      return form.due_date
    }
  }, [form.due_date])

  const buildFormData = (status: 'draft' | 'published') => {
    if (attachment) {
      const err = validateHomeworkImageFile(attachment)
      if (err) {
        toast.error(err)
        return null
      }
    }
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('description', form.description)
    fd.append('subject', form.subject)
    fd.append('assigned_class', form.assigned_class)
    fd.append('due_date', form.due_date)
    fd.append('status', status)
    if (attachment) fd.append('attachment', attachment)
    return fd
  }

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => api.post('/homeworks/', fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homeworks'] })
      toast.success('Homework saved')
      navigate('/homework')
    },
    onError: () => toast.error('Could not save homework'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ fd, hwId }: { fd: FormData; hwId: number }) =>
      api.patch(`/homeworks/${hwId}/`, fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homeworks'] })
      qc.invalidateQueries({ queryKey: ['homework', editId] })
      toast.success('Homework updated')
      navigate('/homework')
    },
    onError: () => toast.error('Could not update homework'),
  })

  const onSave = (status: 'draft' | 'published') => {
    if (!canManage) return
    const fd = buildFormData(status)
    if (!fd) return
    if (editId != null) {
      updateMutation.mutate({ fd, hwId: editId })
    } else {
      createMutation.mutate(fd)
    }
  }

  if (user?.role === 'admin' || user?.role === 'coordinator') {
    return <Navigate to="/admin/homework-explorer" replace />
  }

  if (!canManage) {
    return (
      <div className="relative -m-3 min-h-full overflow-x-hidden sm:-m-4 md:-m-6 md:overflow-hidden p-3 sm:p-4 md:p-6">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-100/95 via-violet-50/85 to-amber-50/60"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/4 h-48 w-80 max-w-full rounded-full bg-teal-200/35 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 rounded-2xl border border-amber-200/50 bg-white/40 py-16 text-center text-amber-900/90 shadow-sm backdrop-blur-sm">
          You do not have permission to create homework.
        </div>
      </div>
    )
  }

  const busy = createMutation.isPending || updateMutation.isPending

  const actionBar = (
    <div className="flex flex-wrap justify-end gap-3">
      <Button
        type="button"
        variant="secondary"
        className={hwBtnSecondary}
        onClick={() => navigate('/homework')}
        disabled={busy}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="secondary"
        className={hwBtnDraft}
        loading={busy}
        onClick={() => onSave('draft')}
      >
        Save draft
      </Button>
      <Button type="submit" className={hwBtnPublish} loading={busy}>
        Publish
      </Button>
    </div>
  )

  return (
    <div className="relative -m-3 min-h-full overflow-x-hidden sm:-m-4 md:-m-6 md:overflow-hidden p-3 pb-10 pt-3 sm:p-4 sm:pt-4 md:p-6 md:pt-6">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-100/95 via-violet-50/85 to-amber-50/60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-24 left-[-10%] h-56 w-[70%] max-w-3xl rounded-full bg-teal-200/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/3 right-[5%] h-44 w-44 rounded-full bg-amber-200/30 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto min-w-0 max-w-6xl space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/30 px-4 py-4 shadow-md shadow-indigo-900/10 backdrop-blur-md sm:px-6 sm:py-5">
        <p className="text-center text-sm font-semibold tracking-wide text-indigo-900 sm:text-base">
          {SCHOOL_NAME_EXPORT}
        </p>
        <div className="relative mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/homework')}
              className="mt-0.5 shrink-0 rounded-lg p-1.5 text-indigo-700/80 transition hover:bg-white/70 hover:text-indigo-900"
              aria-label="Back to homework"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-3 sm:gap-4">
              <div className="hidden rounded-xl bg-indigo-600 p-2 text-white shadow-md shadow-indigo-900/20 ring-2 ring-indigo-400/30 sm:flex sm:p-2.5">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-indigo-950 sm:text-2xl">
                  {editId ? 'Edit homework' : 'Prepare homework'}
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-indigo-900/75 sm:text-sm">
                  One form: class, subject, due date, instructions, and an optional reference photo. Drafts stay private;
                  publishing shares with parents.
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
                  {className && <Badge color="blue">{className}</Badge>}
                  {subjectName && <Badge color="purple">{subjectName}</Badge>}
                  {dueLabel && <Badge color="orange">Due {dueLabel}</Badge>}
                  {!className && !subjectName && !dueLabel && (
                    <span className="text-[10px] leading-snug text-indigo-700/55 sm:text-xs">
                      Pick class, subject, and due date — context chips appear here.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className={`shrink-0 ${hwBtnSecondary}`}
            onClick={() => navigate('/homework/history')}
          >
            <BarChart3 className="h-4 w-4" aria-hidden />
            Previous homework and stats
          </Button>
        </div>
      </section>

      <Card className="overflow-hidden border border-white/50 bg-white/75 p-0 shadow-lg shadow-indigo-900/10 ring-1 ring-white/60 backdrop-blur-sm">
        {loadingHw && editId ? (
          <div className="py-16 text-center text-indigo-400">Loading…</div>
        ) : (
          <form
            className="pb-0"
            onSubmit={(e) => {
              e.preventDefault()
              onSave('published')
            }}
          >
﻿            <div className="space-y-4 bg-white/35 p-5 sm:p-6">
              <div className={hwPanel}>
                <Input
                  label="Title"
                  labelClassName={hwLabelIndigo}
                  className={hwInput}
                  value={form.title}
                  onChange={(e) => setForm((pr) => ({ ...pr, title: e.target.value }))}
                  placeholder="Homework title"
                  required
                />
              </div>

              <div className={`${hwPanel} border-teal-200/55 bg-gradient-to-br from-teal-50/45 to-white/40`}>
                <p className={`mb-3 ${hwLabelTeal}`}>Homework details</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Select
                    label="Class"
                    labelClassName={hwLabelTeal}
                    className={hwSelect}
                    value={form.assigned_class}
                    onChange={(e) => setForm((pr) => ({ ...pr, assigned_class: e.target.value }))}
                    required
                  >
                    <option value="">— Select class —</option>
                    {(classes ?? []).map((c: { id: number; name: string }) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label="Subject"
                    labelClassName={hwLabelTeal}
                    className={hwSelect}
                    value={form.subject}
                    onChange={(e) => setForm((pr) => ({ ...pr, subject: e.target.value }))}
                    required
                  >
                    <option value="">— Select subject —</option>
                    {(subjects ?? []).map((s: { id: number; name: string }) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Due date"
                    labelClassName={hwLabelTeal}
                    className={hwDate}
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((pr) => ({ ...pr, due_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className={`${hwPanel} border-teal-200/45`}>
                <label className={`mb-1.5 block ${hwLabelTeal}`}>Upload picture (optional)</label>
                <p className="mb-2.5 text-[10px] text-teal-800/70 sm:text-xs">
                  Max 2MB · JPEG, PNG, WebP, or GIF
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
                  {attachment && <span className="text-xs text-teal-800/70">{attachment.name}</span>}
                  {existing?.attachment_url && !attachment && (
                    <span className="text-xs text-teal-800/65">Current file kept unless replaced.</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
                <div className={hwPanel}>
                  <Textarea
                    label="Instructions for students and parents"
                    labelClassName={hwLabelIndigo}
                    rows={12}
                    className={hwTextarea}
                    value={form.description}
                    onChange={(e) => setForm((pr) => ({ ...pr, description: e.target.value }))}
                    placeholder="What should students do? Any materials or steps?"
                    required
                  />
                </div>

                <div
                  className={`${hwPanel} border-teal-200/55 border-l-4 border-l-teal-500 bg-gradient-to-br from-teal-50/55 via-white/40 to-indigo-50/45 lg:min-h-0`}
                >
                  <p className={hwLabelTeal}>Parent preview</p>
                  <div className="mt-3 max-h-[min(52vh,24rem)] space-y-2 overflow-y-auto rounded-lg border border-white/50 bg-white/50 p-3 text-sm shadow-inner backdrop-blur-sm sm:p-4">
                    <p
                      className={`font-medium ${form.title.trim() ? 'text-indigo-950' : 'text-indigo-400/75 italic'}`}
                    >
                      {form.title.trim() || 'Title will appear here'}
                    </p>
                    <p
                      className={`whitespace-pre-wrap leading-relaxed ${form.description.trim() ? 'text-indigo-900/80' : 'text-indigo-400/70 italic'}`}
                    >
                      {form.description.trim() || 'Instructions will appear here as plain text.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/45 pt-4">{actionBar}</div>
            </div>

          </form>
        )}
      </Card>
      </div>
    </div>
  )
}
