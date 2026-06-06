import api from '../../../services/api'

export interface ParentHomeworkRow {
  id: number
  title: string
  description?: string
  due_date: string
  subject__name: string
  max_score: number
  attachment_url?: string | null
  submitted: boolean
  submission: {
    id: number
    status: string
    score: number | null
    feedback: string
    notes: string
    file_url?: string | null
  } | null
}

export interface ParentGradeRow {
  id: number | string
  source?: 'structured' | 'legacy'
  exam: string
  exam_type: string
  subject: string
  score: number | null
  max_score: number
  percentage: number | null
  date: string | null
  scoring_mode?: string
  functional_rating?: string | null
  term?: string | null
}

export interface ParentChildDetail {
  child: {
    id: number
    name: string
    student_id: string
    class: string | null
    class_id: number | null
  }
  attendance: { date: string; status: string; notes: string }[]
  attendance_summary: {
    present: number
    absent: number
    late: number
    excused: number
    total: number
  }
  homework: ParentHomeworkRow[]
  grades: ParentGradeRow[]
  grades_by_subject: Record<string, ParentGradeRow[]>
  grades_source?: string
}

export const parentPortalService = {
  getChildDetail: (studentId: number): Promise<ParentChildDetail> =>
    api.get(`/dashboard/parent/children/${studentId}/`).then(r => r.data),
}
