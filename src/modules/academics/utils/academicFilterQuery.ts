export function academicFilterSearch(grade: string, classId: string, subjectId: string): string {
  const p = new URLSearchParams()
  if (grade) p.set('grade', grade)
  if (classId) p.set('class', classId)
  if (subjectId) p.set('subject', subjectId)
  const s = p.toString()
  return s ? `?${s}` : ''
}
