import type { AssessmentColumn } from '../../grades/components/ScoreSheetsTab'
import { parseScoreCell, functionalLabel } from '../../grades/components/ScoreSheetsTab'

export const CANONICAL_TITLE: Record<string, string> = {
  TERM_1_1: 'Assessment 1 (Term 1)',
  TERM_1_2: 'Mid-Term (Term 1)',
  TERM_1_3: 'End of Term 1',
  TERM_2_1: 'Assessment 2 (Term 2)',
  TERM_2_2: 'Mid-Term (Term 2)',
  TERM_2_3: 'End of Term 2',
}

export function displayTitle(at: AssessmentColumn): string {
  const k = `${at.term}_${at.order}`
  return CANONICAL_TITLE[k] ?? at.name
}

export function normalizeAssessmentRow(at: AssessmentColumn): AssessmentColumn {
  return {
    ...at,
    scoring_mode: at.scoring_mode === 'functional' ? 'functional' : 'numeric',
    scores: Object.fromEntries(Object.entries(at.scores ?? {}).map(([k, v]) => [k, parseScoreCell(v)])),
  }
}

export function formatStudentScoreCell(at: AssessmentColumn, studentId: number): string {
  const cell = parseScoreCell(at.scores[String(studentId)])
  if ((at.scoring_mode ?? 'numeric') === 'functional') {
    return functionalLabel(cell.functional_rating)
  }
  if (cell.score != null && cell.score !== '') {
    const s = Math.round(Number(cell.score))
    const mx = Math.round(Number(at.max_score))
    return `${s} / ${mx}`
  }
  return '—'
}
