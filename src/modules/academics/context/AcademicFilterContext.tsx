import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface AcademicFilterState {
  grade: string
  classId: string
  subjectId: string
}

interface AcademicFilterContextValue extends AcademicFilterState {
  setGrade: (v: string) => void
  setClassId: (v: string) => void
  setSubjectId: (v: string) => void
  clearClassAndSubject: () => void
}

const AcademicFilterContext = createContext<AcademicFilterContextValue | null>(null)

export function AcademicFilterProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const grade = searchParams.get('grade') ?? ''
  const classId = searchParams.get('class') ?? ''
  const subjectId = searchParams.get('subject') ?? ''

  const patch = useCallback(
    (next: Partial<{ grade: string; class: string; subject: string }>) => {
      setSearchParams(
        prev => {
          const p = new URLSearchParams(prev)
          if (next.grade !== undefined) {
            if (next.grade) p.set('grade', next.grade)
            else p.delete('grade')
          }
          if (next.class !== undefined) {
            if (next.class) p.set('class', next.class)
            else p.delete('class')
          }
          if (next.subject !== undefined) {
            if (next.subject) p.set('subject', next.subject)
            else p.delete('subject')
          }
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setGrade = useCallback(
    (v: string) => {
      patch({ grade: v, class: '', subject: '' })
    },
    [patch],
  )

  const setClassId = useCallback(
    (v: string) => {
      patch({ class: v, subject: '' })
    },
    [patch],
  )

  const setSubjectId = useCallback(
    (v: string) => {
      patch({ subject: v })
    },
    [patch],
  )

  const clearClassAndSubject = useCallback(() => {
    patch({ class: '', subject: '' })
  }, [patch])

  const value = useMemo(
    () => ({
      grade,
      classId,
      subjectId,
      setGrade,
      setClassId,
      setSubjectId,
      clearClassAndSubject,
    }),
    [grade, classId, subjectId, setGrade, setClassId, setSubjectId, clearClassAndSubject],
  )

  return <AcademicFilterContext.Provider value={value}>{children}</AcademicFilterContext.Provider>
}

export function useAcademicFilter() {
  const ctx = useContext(AcademicFilterContext)
  if (!ctx) throw new Error('useAcademicFilter must be used within AcademicFilterProvider')
  return ctx
}
