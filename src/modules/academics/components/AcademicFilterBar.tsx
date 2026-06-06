import { useQuery } from '@tanstack/react-query'
import api from '../../../services/api'
import { cn } from '../../../utils/cn'
import { useAcademicFilter } from '../context/AcademicFilterContext'

const selectCls = (active: boolean) =>
  cn(
    'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition',
    active
      ? 'border-blue-500 bg-blue-50/70 font-medium text-blue-900 shadow-sm ring-2 ring-blue-400/40'
      : 'border-gray-300 text-gray-900 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/35',
    '[&:disabled]:cursor-not-allowed [&:disabled]:bg-gray-100 [&:disabled]:opacity-70',
  )

export default function AcademicFilterBar() {
  const { grade, classId, subjectId, setGrade, setClassId, setSubjectId } = useAcademicFilter()

  const { data: gradeLevelsRes } = useQuery({
    queryKey: ['classes', 'grade-levels'],
    queryFn: () => api.get('/classes/grade-levels/').then(r => r.data as { grade_levels: string[] }),
  })

  const levels = gradeLevelsRes?.grade_levels ?? []

  const { data: allClasses } = useQuery({
    queryKey: ['classes', 'academic-filter'],
    queryFn: () => api.get('/classes/').then(r => r.data.results ?? r.data),
  })

  const classOptions =
    (allClasses as { id: number; name: string; grade_level: string }[] | undefined)?.filter(
      c => !grade || c.grade_level === grade,
    ) ?? []

  const subjectsQueryKey = ['subjects', 'academic-filter', grade, classId] as const

  const {
    data: subjectsRaw,
    isLoading: subjectsLoading,
    isFetching: subjectsFetching,
  } = useQuery({
    queryKey: subjectsQueryKey,
    enabled: Boolean(grade),
    queryFn: () => {
      const params: Record<string, string | number> = {
        page_size: 200,
        ordering: 'name',
      }
      if (classId) {
        params.assigned_class = Number(classId)
      } else {
        params.grade_level = grade
      }
      return api.get('/subjects/', { params }).then(r => r.data.results ?? r.data)
    },
  })

  const subjects =
    (subjectsRaw as { id: number; name: string; assigned_class_detail?: { name: string } }[] | undefined) ??
    []
  const subjectsBusy = subjectsLoading || subjectsFetching

  return (
    <div className="rounded-xl border border-blue-100/80 bg-gradient-to-br from-white to-blue-50/30 p-4 shadow-sm ring-1 ring-blue-100/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-900/80">
            Grade level
          </label>
          <select
            value={grade}
            onChange={e => setGrade(e.target.value)}
            className={selectCls(Boolean(grade))}
          >
            <option value="">All grades</option>
            {levels.map(l => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-900/80">
            Class (optional)
          </label>
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            className={selectCls(Boolean(classId))}
            disabled={!grade}
          >
            <option value="">{grade ? '— Any class in this grade —' : 'Select a grade first'}</option>
            {classOptions.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-900/80">
            Subject (optional)
          </label>
          <div className="relative">
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              className={selectCls(Boolean(subjectId))}
              disabled={!grade || subjectsBusy}
            >
              <option value="">
                {!grade
                  ? 'Select a grade first'
                  : subjectsBusy
                    ? 'Loading subjects…'
                    : subjects.length === 0
                      ? 'No subjects available'
                      : '— Any subject —'}
              </option>
              {subjects.map(s => {
                const clsName = s.assigned_class_detail?.name
                const label = clsName && !classId ? `${s.name} (${clsName})` : s.name
                return (
                  <option key={s.id} value={s.id}>
                    {label}
                  </option>
                )
              })}
            </select>
            {subjectsBusy && grade ? (
              <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            ) : null}
          </div>
          {grade && !subjectsBusy && subjects.length === 0 ? (
            <p className="mt-1 text-xs text-amber-700">
              No subjects for this grade/class. Run academic demo seed or link subjects to classes in admin.
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Filters sync to the URL so you can bookmark or share links.
      </p>
    </div>
  )
}
