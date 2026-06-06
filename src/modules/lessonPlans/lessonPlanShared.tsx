import type { ReactNode } from 'react'
import api from '../../services/api'

export interface ClassRow {
  id: number
  name: string
  grade_level: string
}

export interface SubjectRow {
  id: number
  name: string
  code: string
}

/** Statuses that mean the plan is visible to parents (matches backend). */
export const PARENT_VISIBLE_LESSON_PLAN_STATUSES = ['coordinator_approved', 'admin_approved'] as const

export function isLessonPlanVisibleToParent(status: string): boolean {
  return (PARENT_VISIBLE_LESSON_PLAN_STATUSES as readonly string[]).includes(status)
}

export interface LessonPlan {
  id: number
  title: string
  teacher_name: string
  subject: number
  subject_detail: { name: string }
  assigned_class: number
  class_detail: { name: string }
  status: string
  objectives: string
  activities: string
  materials: string
  week_start: string
  week_end: string
  draft_data?: Partial<FormState>
  /** Present when API returns file path/URL for an uploaded attachment */
  attachment?: string | null
}

export interface FormState {
  title: string
  objectives: string
  activities: string
  materials: string
  subject: string
  assigned_class: string
  week_start: string
  week_end: string
}

export const BLANK_FORM: FormState = {
  title: '',
  objectives: '',
  activities: '',
  materials: '',
  subject: '',
  assigned_class: '',
  week_start: '',
  week_end: '',
}

export const CREATE_DRAFT_STORAGE_KEY = 'lesson-plan-draft:create'

export const sectionLabel =
  'text-[10px] font-semibold uppercase tracking-wider text-indigo-800/90 sm:text-xs'

export const tableShell =
  'border-white/50 bg-white/75 shadow-sm shadow-indigo-900/5 backdrop-blur-sm [&_thead]:bg-indigo-50/70 [&_th]:text-indigo-800/80'

export function unwrapResults<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: T[] }).results)) {
    return (data as { results: T[] }).results
  }
  return []
}

/** Paginated fetch of parent-visible lesson plans (server enforces class + approval rules). */
export async function fetchAllLessonPlansForParent(): Promise<LessonPlan[]> {
  const all: LessonPlan[] = []
  let page = 1
  const pageSize = 200
  while (page < 100) {
    const { data } = await api.get('/lesson-plans/for-parent/', {
      params: { page_size: pageSize, page },
    })
    all.push(...unwrapResults<LessonPlan>(data))
    const next =
      data && typeof data === 'object' && 'next' in data ? (data as { next: string | null }).next : null
    if (!next) break
    page += 1
  }
  return all
}

export async function fetchAllPagesForClass(classId: string): Promise<LessonPlan[]> {
  const all: LessonPlan[] = []
  let page = 1
  const pageSize = 500
  while (page < 100) {
    const { data } = await api.get('/lesson-plans/', {
      params: { assigned_class: classId, page_size: pageSize, page },
    })
    all.push(...unwrapResults<LessonPlan>(data))
    const next =
      data && typeof data === 'object' && 'next' in data ? (data as { next: string | null }).next : null
    if (!next) break
    page += 1
  }
  return all
}

/** All lesson plans visible to the current user (teachers: own plans only), paginated. */
export async function fetchAllLessonPlansList(): Promise<LessonPlan[]> {
  const all: LessonPlan[] = []
  let page = 1
  const pageSize = 200
  while (page < 100) {
    const { data } = await api.get('/lesson-plans/', {
      params: { page_size: pageSize, page, ordering: '-created_at' },
    })
    all.push(...unwrapResults<LessonPlan>(data))
    const next =
      data && typeof data === 'object' && 'next' in data ? (data as { next: string | null }).next : null
    if (!next) break
    page += 1
  }
  return all
}

export interface SubjectWithClass {
  id: number
  name: string
  code: string
  assigned_class: number | null
}

export interface ClassSubjectOption {
  classId: number
  subjectId: number
  className: string
  gradeLevel: string
  subjectName: string
  searchBlob: string
}

export interface ClassSubjectGrouped {
  classId: number
  className: string
  gradeLevel: string
  subjects: { subjectId: number; subjectName: string; option: ClassSubjectOption }[]
}

export function groupClassSubjectOptionsByClass(options: ClassSubjectOption[]): ClassSubjectGrouped[] {
  const byClass = new Map<number, ClassSubjectGrouped>()
  for (const o of options) {
    let g = byClass.get(o.classId)
    if (!g) {
      g = { classId: o.classId, className: o.className, gradeLevel: o.gradeLevel, subjects: [] }
      byClass.set(o.classId, g)
    }
    g.subjects.push({ subjectId: o.subjectId, subjectName: o.subjectName, option: o })
  }
  for (const g of byClass.values()) {
    g.subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName, undefined, { sensitivity: 'base' }))
  }
  return Array.from(byClass.values()).sort((a, b) =>
    a.className.localeCompare(b.className, undefined, { sensitivity: 'base' }),
  )
}

export interface RecentClassSubjectPick {
  classId: number
  subjectId: number
}

export async function fetchAllSubjectsPages(): Promise<SubjectWithClass[]> {
  const all: SubjectWithClass[] = []
  let page = 1
  const pageSize = 500
  while (page < 100) {
    const { data } = await api.get('/subjects/', {
      params: { page_size: pageSize, page, ordering: 'name' },
    })
    all.push(...unwrapResults<SubjectWithClass>(data))
    const next =
      data && typeof data === 'object' && 'next' in data ? (data as { next: string | null }).next : null
    if (!next) break
    page += 1
  }
  return all
}

export function buildClassSubjectOptions(classes: ClassRow[], subjects: SubjectWithClass[]): ClassSubjectOption[] {
  const globals = subjects.filter((s) => s.assigned_class == null)
  const byClass = new Map<number, SubjectWithClass[]>()
  for (const s of subjects) {
    if (s.assigned_class == null) continue
    const list = byClass.get(s.assigned_class) ?? []
    list.push(s)
    byClass.set(s.assigned_class, list)
  }
  const out: ClassSubjectOption[] = []
  for (const c of classes) {
    const specific = byClass.get(c.id) ?? []
    const merged = [...specific, ...globals].sort((a, b) => a.name.localeCompare(b.name))
    const seen = new Set<number>()
    for (const s of merged) {
      if (seen.has(s.id)) continue
      seen.add(s.id)
      out.push({
        classId: c.id,
        subjectId: s.id,
        className: c.name,
        gradeLevel: c.grade_level,
        subjectName: s.name,
        searchBlob: `${c.name} ${c.grade_level} ${s.name} ${s.code ?? ''}`.toLowerCase(),
      })
    }
  }
  return out.sort((a, b) =>
    `${a.className} ${a.subjectName}`.localeCompare(`${b.className} ${b.subjectName}`, undefined, {
      sensitivity: 'base',
    }),
  )
}

function recentStorageKey(userKey: string): string {
  return `lp-explorer-recent:${userKey}`
}

export function loadRecentPicks(userKey: string): RecentClassSubjectPick[] {
  try {
    const raw = window.localStorage.getItem(recentStorageKey(userKey))
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentClassSubjectPick[]
    return Array.isArray(parsed)
      ? parsed.filter((p) => p && typeof p.classId === 'number' && typeof p.subjectId === 'number')
      : []
  } catch {
    return []
  }
}

export function pushRecentPick(userKey: string, pick: RecentClassSubjectPick, max = 8): void {
  const prev = loadRecentPicks(userKey).filter((p) => !(p.classId === pick.classId && p.subjectId === pick.subjectId))
  const next = [pick, ...prev].slice(0, max)
  window.localStorage.setItem(recentStorageKey(userKey), JSON.stringify(next))
}

export function lessonPlanStatusBadgeClass(status: string): string {
  if (status === 'admin_approved') return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
  if (status === 'rejected') return 'bg-red-100 text-red-800 ring-1 ring-red-200'
  if (status === 'draft') return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
  if (status === 'submitted' || status === 'coordinator_approved') {
    return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200'
  }
  return 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200'
}

export function subjectIdFromPlan(p: LessonPlan): string {
  const s = p.subject as unknown
  if (s == null) return ''
  if (typeof s === 'object' && 'id' in (s as object)) {
    return String((s as { id: number }).id)
  }
  return String(s)
}

export function optionsFromLessonPlans(plans: LessonPlan[]): ClassSubjectOption[] {
  const seen = new Set<string>()
  const out: ClassSubjectOption[] = []
  for (const p of plans) {
    const sid = subjectIdFromPlan(p)
    if (!sid) continue
    const cid = Number(p.assigned_class)
    if (Number.isNaN(cid)) continue
    const k = `${cid}:${sid}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push({
      classId: cid,
      subjectId: Number(sid),
      className: p.class_detail?.name ?? 'Class',
      gradeLevel: '',
      subjectName: p.subject_detail?.name ?? 'Subject',
      searchBlob: `${p.class_detail?.name ?? ''} ${p.subject_detail?.name ?? ''}`.toLowerCase(),
    })
  }
  return out.sort((a, b) =>
    `${a.className} ${a.subjectName}`.localeCompare(`${b.className} ${b.subjectName}`, undefined, {
      sensitivity: 'base',
    }),
  )
}

export function ProgressBar({ pct }: { pct: number }) {
  const w = Math.min(100, Math.max(0, pct))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100/90">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all"
        style={{ width: `${w}%` }}
      />
    </div>
  )
}

export function ExplorerShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative -m-3 min-h-full overflow-x-hidden p-3 pb-6 pt-3 sm:-m-4 sm:p-4 sm:pb-8 sm:pt-4 md:-m-6 md:overflow-hidden md:p-6 md:pb-8 md:pt-6">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-100/95 via-violet-50/85 to-amber-50/60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-32 left-[-10%] h-56 w-[65%] max-w-3xl rounded-full bg-teal-200/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[8%] top-1/4 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 min-w-0">{children}</div>
    </div>
  )
}

export function lessonPlanStatusProgress(status: string): { pct: number; label: string } {
  const map: Record<string, { pct: number; label: string }> = {
    draft: { pct: 0, label: 'Draft' },
    submitted: { pct: 40, label: 'Pending review' },
    coordinator_approved: { pct: 70, label: 'Coordinator approved' },
    admin_approved: { pct: 100, label: 'Fully approved' },
    rejected: { pct: 0, label: 'Rejected' },
  }
  return map[status] ?? { pct: 25, label: status.replace(/_/g, ' ') }
}

export function getDraftStorageKey(planId?: number) {
  return planId ? `lesson-plan-draft:edit:${planId}` : CREATE_DRAFT_STORAGE_KEY
}

export function loadStoredDraft(key: string): FormState | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return { ...BLANK_FORM, ...(JSON.parse(raw) as Partial<FormState>) }
  } catch {
    return null
  }
}

export function saveStoredDraft(key: string, form: FormState) {
  window.localStorage.setItem(key, JSON.stringify(form))
}

export function clearStoredDraft(key: string) {
  window.localStorage.removeItem(key)
}

export function planToForm(plan: LessonPlan): FormState {
  return {
    title: String(plan.draft_data?.title ?? plan.title ?? ''),
    objectives: String(plan.draft_data?.objectives ?? plan.objectives ?? ''),
    activities: String(plan.draft_data?.activities ?? plan.activities ?? ''),
    materials: String(plan.draft_data?.materials ?? plan.materials ?? ''),
    subject: String(plan.draft_data?.subject ?? plan.subject ?? ''),
    assigned_class: String(plan.draft_data?.assigned_class ?? plan.assigned_class ?? ''),
    week_start: String(plan.draft_data?.week_start ?? plan.week_start ?? ''),
    week_end: String(plan.draft_data?.week_end ?? plan.week_end ?? ''),
  }
}
