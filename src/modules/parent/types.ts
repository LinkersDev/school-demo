export interface ParentSubmission {
  id: number
  status: 'submitted' | 'graded' | 'pending' | 'late'
  score: number | null
  feedback: string
  notes?: string
}

export interface ParentHomeworkItem {
  id: number
  title: string
  description?: string
  due_date: string
  subject__name: string
  max_score: number
  submitted: boolean
  submission: ParentSubmission | null
}

export interface ParentDashboardChild {
  id: number
  name: string
  student_id: string
  class: string | null
  class_id: number | null
  recent_attendance: { date: string; status: string }[]
  recent_homework: ParentHomeworkItem[]
  recent_grades: {
    exam: string
    subject: string
    score: number
    max_score: number
    percentage: number
  }[]
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
    total_days: number
    present: number
    absent: number
    late: number
    excused: number
    rate: number
  }
  homework: ParentHomeworkItem[]
  grades: {
    id: number
    exam: string
    subject: string
    score: number
    max_score: number
    percentage: number
    date: string | null
  }[]
  grades_by_subject: Record<string, { exam: string; score: number; max_score: number; percentage: number }[]>
}
