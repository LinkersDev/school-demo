import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react'
import { cn } from '../../../utils/cn'
import {
  groupClassSubjectOptionsByClass,
  type ClassSubjectGrouped,
  type ClassSubjectOption,
  type RecentClassSubjectPick,
} from '../lessonPlanShared'
import SubjectPill from './SubjectPill'

function useIsMobilePicker() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

function optionKey(o: ClassSubjectOption): string {
  return `${o.classId}-${o.subjectId}`
}

/** One unique class+subject when tokens all hit searchBlob (e.g. "g1 math"). */
function findDirectPick(pool: ClassSubjectOption[], raw: string): ClassSubjectOption | null {
  const q = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (q.length < 2) return null
  const normalizedArrow = q.replace(/[→›>]/g, ' ').replace(/\s+/g, ' ').trim()
  const tokens = normalizedArrow.split(' ').filter((t) => t.length > 0)
  if (tokens.length === 0) return null

  const everyToken = (o: ClassSubjectOption) => tokens.every((t) => o.searchBlob.includes(t))
  let matches = pool.filter(everyToken)
  if (matches.length === 1) return matches[0]

  const lineMatch = pool.filter((o) => {
    const line = `${o.className} ${o.subjectName}`.toLowerCase().replace(/\s+/g, ' ')
    return line === normalizedArrow || line.includes(normalizedArrow)
  })
  if (lineMatch.length === 1) return lineMatch[0]

  const collapsedQ = normalizedArrow.replace(/\s/g, '')
  if (collapsedQ.length >= 3) {
    matches = pool.filter((o) => o.searchBlob.replace(/\s/g, '').includes(collapsedQ))
    if (matches.length === 1) return matches[0]
  }

  return null
}

function dedupeSubjects(g: ClassSubjectGrouped): ClassSubjectGrouped['subjects'] {
  const m = new Map<number, ClassSubjectGrouped['subjects'][0]>()
  for (const s of g.subjects) {
    if (!m.has(s.subjectId)) m.set(s.subjectId, s)
  }
  return [...m.values()].sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName, undefined, { sensitivity: 'base' }),
  )
}

function classRowVisible(g: ClassSubjectGrouped, q: string): boolean {
  if (!q) return true
  const cn = g.className.toLowerCase()
  const gl = g.gradeLevel.toLowerCase()
  if (cn.includes(q) || gl.includes(q)) return true
  return g.subjects.some((s) => s.subjectName.toLowerCase().includes(q))
}

export interface SmartPickerModalProps {
  open: boolean
  onClose: () => void
  mode: 'full' | 'parentSubjects'
  loading?: boolean
  options: ClassSubjectOption[]
  recentPicks?: RecentClassSubjectPick[]
  onSelect: (o: ClassSubjectOption) => void
  selectedClassId?: number | null
  selectedSubjectId?: number | null
  parentContextLabel?: string
}

export default function SmartPickerModal({
  open,
  onClose,
  mode,
  loading,
  options,
  recentPicks = [],
  onSelect,
  selectedClassId,
  selectedSubjectId,
  parentContextLabel,
}: SmartPickerModalProps) {
  const mobile = useIsMobilePicker()
  const [search, setSearch] = useState('')
  const [step, setStep] = useState<'classes' | 'subjects'>('classes')
  const [activeGroup, setActiveGroup] = useState<ClassSubjectGrouped | null>(null)

  useEffect(() => {
    if (!open) return
    setStep('classes')
    setActiveGroup(null)
    setSearch('')
  }, [open])

  const optionByKey = useMemo(() => new Map(options.map((o) => [optionKey(o), o])), [options])

  const allGroups = useMemo(() => groupClassSubjectOptionsByClass(options), [options])

  const recentOptions = useMemo(() => {
    const out: ClassSubjectOption[] = []
    for (const r of recentPicks) {
      const o = optionByKey.get(`${r.classId}-${r.subjectId}`)
      if (o) out.push(o)
    }
    return out
  }, [recentPicks, optionByKey])

  const searchNorm = search.trim().toLowerCase()

  const filteredClassList = useMemo(() => {
    if (mode !== 'full') return []
    return allGroups.filter((g) => classRowVisible(g, searchNorm))
  }, [mode, allGroups, searchNorm])

  const stepSubjects = useMemo(() => {
    if (!activeGroup) return []
    const unique = dedupeSubjects(activeGroup)
    if (!searchNorm || step !== 'subjects') return unique
    return unique.filter((s) => s.subjectName.toLowerCase().includes(searchNorm))
  }, [activeGroup, searchNorm, step])

  const directMatchPool = useMemo(() => {
    if (mode !== 'full') return options
    if (step === 'subjects' && activeGroup) {
      return dedupeSubjects(activeGroup).map((s) => s.option)
    }
    return options
  }, [mode, step, activeGroup, options])

  const directMatch = useMemo(
    () => findDirectPick(directMatchPool, search),
    [directMatchPool, search],
  )

  const parentSubjectRows = useMemo(() => {
    if (mode !== 'parentSubjects') return []
    const sorted = [...options].sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName, undefined, { sensitivity: 'base' }),
    )
    const seen = new Set<number>()
    const uniq: ClassSubjectOption[] = []
    for (const o of sorted) {
      if (seen.has(o.subjectId)) continue
      seen.add(o.subjectId)
      uniq.push(o)
    }
    return uniq
  }, [mode, options])

  const handlePick = (o: ClassSubjectOption) => {
    onSelect(o)
    onClose()
  }

  const goBackToClasses = () => {
    setStep('classes')
    setActiveGroup(null)
    setSearch('')
  }

  const openClass = (g: ClassSubjectGrouped) => {
    setActiveGroup(g)
    setStep('subjects')
    setSearch('')
  }

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    if (directMatch) {
      handlePick(directMatch)
      return
    }
    if (step === 'classes' && filteredClassList.length === 1) {
      openClass(filteredClassList[0])
    }
  }

  const headerTitle =
    mode === 'parentSubjects'
      ? 'Select subject'
      : step === 'subjects' && activeGroup
        ? activeGroup.className
        : 'Select a class'

  const searchPlaceholder =
    step === 'subjects' ? 'Filter subjects…' : 'Try G1 Math or search classes…'

  const bodyContent =
    mode === 'parentSubjects' ? (
      <div className="space-y-5">
        {parentContextLabel ? (
          <p className="text-center text-sm font-medium text-gray-800">{parentContextLabel}</p>
        ) : null}
        {loading ? (
          <p className="py-12 text-center text-sm text-gray-500">Loading…</p>
        ) : parentSubjectRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No subjects with published plans yet.</p>
        ) : (
          <div className="flex max-h-[min(50vh,20rem)] flex-wrap justify-center gap-2 overflow-y-auto sm:max-h-[min(55vh,24rem)] sm:justify-start">
            {parentSubjectRows.map((o) => (
              <SubjectPill
                key={optionKey(o)}
                label={o.subjectName}
                size="touch"
                selected={
                  selectedClassId != null &&
                  selectedSubjectId != null &&
                  o.classId === selectedClassId &&
                  o.subjectId === selectedSubjectId
                }
                onClick={() => handlePick(o)}
              />
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={searchPlaceholder}
            autoComplete="off"
            className="w-full rounded-xl border border-indigo-200/60 bg-white py-2.5 pl-10 pr-3 text-sm text-indigo-950 shadow-sm placeholder:text-indigo-700/45 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
          />
        </div>

        {directMatch ? (
          <p className="text-xs text-indigo-700/90">
            <span className="font-medium">Match:</span> {directMatch.className} → {directMatch.subjectName}
            <span className="ml-1 text-indigo-600">· Enter to select</span>
          </p>
        ) : null}

        {recentOptions.length > 0 && step === 'classes' && !search.trim() ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-800/70">Recent</p>
            <div className="flex flex-wrap gap-2">
              {recentOptions.slice(0, 8).map((o) => (
                <button
                  key={`${optionKey(o)}-recent`}
                  type="button"
                  onClick={() => handlePick(o)}
                  className="rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3 py-1.5 text-xs font-medium text-indigo-900 transition hover:border-indigo-400 hover:bg-white"
                >
                  {o.className} → {o.subjectName}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="py-12 text-center text-sm text-indigo-700/60">Loading…</p>
        ) : step === 'classes' ? (
          filteredClassList.length === 0 ? (
            <p className="py-12 text-center text-sm text-indigo-700/60">No classes match your search.</p>
          ) : (
            <div
              className={cn(
                'max-h-[min(48vh,20rem)] space-y-2 overflow-y-auto pr-1 sm:max-h-[min(56vh,24rem)]',
                mobile && 'max-h-[50vh]',
              )}
            >
              {filteredClassList.map((g) => (
                <button
                  key={g.classId}
                  type="button"
                  onClick={() => openClass(g)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-indigo-200/55 bg-gradient-to-r from-white to-indigo-50/50 px-4 py-3.5 text-left shadow-sm transition hover:border-indigo-300/70 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-indigo-950">{g.className}</div>
                    {g.gradeLevel ? (
                      <div className="mt-0.5 text-xs text-indigo-700/75">{g.gradeLevel}</div>
                    ) : null}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-indigo-400" aria-hidden />
                </button>
              ))}
            </div>
          )
        ) : activeGroup ? (
          stepSubjects.length === 0 ? (
            <p className="py-8 text-center text-sm text-indigo-700/60">No subjects match your filter.</p>
          ) : (
            <div className="space-y-2">
              {activeGroup.gradeLevel ? (
                <p className="text-xs text-indigo-700/75">{activeGroup.gradeLevel}</p>
              ) : null}
              <div
                className={cn(
                  'flex max-h-[min(48vh,20rem)] flex-wrap gap-2 overflow-y-auto pr-1 sm:max-h-[min(56vh,24rem)]',
                  mobile && 'max-h-[50vh]',
                )}
              >
                {stepSubjects.map((s) => (
                  <SubjectPill
                    key={`${activeGroup.classId}-${s.subjectId}`}
                    label={s.subjectName}
                    size={mobile ? 'touch' : 'comfortable'}
                    selected={
                      selectedClassId === activeGroup.classId &&
                      selectedSubjectId != null &&
                      s.subjectId === selectedSubjectId
                    }
                    onClick={() => handlePick(s.option)}
                  />
                ))}
              </div>
            </div>
          )
        ) : null}
      </div>
    )

  const chrome = (
    <>
      <div className="flex items-center gap-2 border-b border-indigo-100/80 px-3 py-3 sm:gap-3 sm:px-5">
        {mode === 'full' && step === 'subjects' ? (
          <button
            type="button"
            onClick={goBackToClasses}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Classes</span>
          </button>
        ) : (
          <div className="w-9 shrink-0 sm:w-0" aria-hidden />
        )}
        <h2 className="min-w-0 flex-1 text-center text-base font-semibold text-indigo-950 sm:text-left sm:text-lg">
          {headerTitle}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-indigo-500 transition hover:bg-indigo-50 hover:text-indigo-800"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className={cn('px-4 py-4 sm:px-5 sm:py-5', mobile && mode === 'full' && 'pb-6')}>{bodyContent}</div>
    </>
  )

  if (!open) return null

  if (mobile) {
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[60] bg-indigo-950/50"
          aria-label="Close picker"
          onClick={onClose}
        />
        <div
          className="fixed inset-x-0 bottom-0 z-[70] max-h-[90vh] overflow-hidden rounded-t-2xl border-t border-indigo-200/70 bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="smart-picker-title"
        >
          <span id="smart-picker-title" className="sr-only">
            {headerTitle}
          </span>
          <div className="flex justify-center pt-2">
            <div className="h-1 w-10 rounded-full bg-indigo-200" aria-hidden />
          </div>
          {chrome}
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close picker overlay"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-indigo-100/80 bg-white shadow-2xl shadow-indigo-900/15 sm:max-w-xl',
          mode === 'full' && 'sm:max-w-md',
        )}
      >
        {chrome}
      </div>
    </div>
  )
}
