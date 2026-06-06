import type {
  AxiosAdapter,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import {
  DEMO_PASSWORD,
  DEMO_USERS,
  GRADE_LEVELS,
  demoAssessmentTypes,
  demoAttendance,
  demoClasses,
  demoExams,
  demoGrades,
  demoHomeworks,
  demoLessonPlans,
  demoNotifications,
  demoParents,
  demoRoles,
  demoStudents,
  demoSubjects,
  demoTeachers,
  demoUsers,
} from './data'

type DemoPayload = unknown
type Params = Record<string, unknown>

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

function normalizePath(url: string | undefined): string {
  const raw = url ?? '/'
  const parsed = raw.startsWith('http') ? new URL(raw).pathname : raw.split('?')[0]
  return parsed.replace(/^\/api/, '').replace(/\/+$/, '/') || '/'
}

function paramsOf(config: InternalAxiosRequestConfig): Params {
  return (config.params && typeof config.params === 'object' ? config.params : {}) as Params
}

function paginated<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

function response(config: InternalAxiosRequestConfig, data: DemoPayload, status = 200): AxiosResponse {
  return {
    data,
    status,
    statusText: status >= 400 ? 'Error' : 'OK',
    headers: {},
    config,
  }
}

function textParam(params: Params, key: string): string {
  const value = params[key]
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function numberParam(params: Params, key: string): number | null {
  const raw = textParam(params, key)
  const value = Number(raw)
  return Number.isFinite(value) && raw !== '' ? value : null
}

function withClassFilter(params: Params) {
  const assignedClass = numberParam(params, 'assigned_class') ?? numberParam(params, 'class_id')
  if (!assignedClass) return demoStudents
  return demoStudents.filter(student => student.assigned_class === assignedClass)
}

function attendanceReport() {
  return demoStudents.slice(0, 50).map((student, index) => ({
    student__id: student.id,
    student__first_name: student.first_name,
    student__last_name: student.last_name,
    total: 20,
    present: index % 6 === 0 ? 16 : 19,
    absent: index % 6 === 0 ? 4 : 1,
    late: index % 5 === 0 ? 2 : 0,
  }))
}

function parentChildren() {
  const children = [demoStudents[2], demoStudents[33]].filter(Boolean)
  return children.map(child => ({
    id: child.id,
    name: child.full_name,
    student_id: child.student_id,
    class: child.assigned_class_detail.name,
    class_id: child.assigned_class,
    recent_attendance: demoAttendance
      .filter(row => row.student === child.id)
      .map(row => ({ date: row.date, status: row.status })),
    recent_homework: demoHomeworks.slice(0, 6).map((homework, index) => ({
      id: homework.id,
      title: homework.title,
      description: homework.description,
      due_date: homework.due_date,
      subject__name: homework.subject__name,
      max_score: homework.max_score,
      attachment_url: null,
      submitted: index % 2 === 0,
      submission:
        index % 2 === 0
          ? {
              id: index + 1,
              status: index % 4 === 0 ? 'graded' : 'submitted',
              score: index % 4 === 0 ? 18 : null,
              feedback: index % 4 === 0 ? 'Good work.' : '',
              notes: '',
              file_url: null,
            }
          : null,
    })),
    recent_grades: demoGrades
      .filter(grade => grade.student === child.id)
      .slice(0, 6)
      .map(grade => ({
        exam: grade.exam_detail.title,
        subject: grade.subject,
        score: grade.score,
        max_score: grade.max_score,
        percentage: grade.percentage,
      })),
  }))
}

function parentChildDetail(studentId: number) {
  const child = demoStudents.find(student => student.id === studentId) ?? demoStudents[2]
  const grades = demoGrades
    .filter(grade => grade.student === child.id)
    .map(grade => ({
      id: grade.id,
      source: 'structured',
      exam: grade.exam_detail.title,
      exam_type: 'Mid Term',
      subject: grade.subject,
      score: grade.score,
      max_score: grade.max_score,
      percentage: grade.percentage,
      date: grade.date,
      term: 'TERM_1',
    }))
  return {
    child: {
      id: child.id,
      name: child.full_name,
      student_id: child.student_id,
      class: child.assigned_class_detail.name,
      class_id: child.assigned_class,
    },
    attendance: demoAttendance
      .filter(row => row.student === child.id)
      .map(row => ({ date: row.date, status: row.status, notes: row.notes })),
    attendance_summary: { present: 18, absent: 1, late: 1, excused: 0, total: 20 },
    homework: parentChildren()[0]?.recent_homework ?? [],
    grades,
    grades_by_subject: grades.reduce<Record<string, typeof grades>>((acc, grade) => {
      acc[grade.subject] = [...(acc[grade.subject] ?? []), grade]
      return acc
    }, {}),
    grades_source: 'demo',
  }
}

function matrix(params: Params) {
  const classId = numberParam(params, 'assigned_class') ?? demoClasses[2].id
  const subjectId = numberParam(params, 'subject') ?? demoSubjects.find(s => s.assigned_class === classId)?.id
  const klass = demoClasses.find(item => item.id === classId) ?? demoClasses[2]
  const subject = demoSubjects.find(item => item.id === subjectId) ?? demoSubjects[0]
  const students = demoStudents
    .filter(student => student.assigned_class === klass.id)
    .slice(0, 12)
    .map(student => ({
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      student_id: student.student_id,
    }))
  const assessments = demoAssessmentTypes.map((type, index) => ({
    id: type.id,
    name: type.name,
    term: index < 2 ? 'TERM_1' : 'TERM_2',
    order: index + 1,
    max_score: String(type.max_score),
    scoring_mode: 'numeric',
    sheet: {
      id: type.id,
      status: index === 1 ? 'submitted' : 'draft',
      entered_by: 'Daniel Brooks',
      approved_by: null,
      rejection_note: '',
      submitted_at: index === 1 ? new Date().toISOString() : null,
      approved_at: null,
    },
    scores: Object.fromEntries(
      students.map((student, studentIndex) => [
        String(student.id),
        { score: String(68 + ((studentIndex + index * 9) % 27)), functional_rating: null },
      ]),
    ),
  }))
  return {
    class: { id: klass.id, name: klass.name, grade_level: klass.grade_level },
    subject: { id: subject.id, name: subject.name },
    students,
    assessments,
  }
}

function scoreSheets() {
  return demoClasses.slice(2, 7).map((klass, index) => {
    const subject = demoSubjects.find(item => item.assigned_class === klass.id) ?? demoSubjects[0]
    const assessment = demoAssessmentTypes[index % demoAssessmentTypes.length]
    return {
      id: index + 1,
      assigned_class: klass.id,
      class_detail: { id: klass.id, name: klass.name },
      subject: subject.id,
      subject_detail: { id: subject.id, name: subject.name },
      assessment_type: assessment.id,
      assessment_type_detail: { id: assessment.id, name: assessment.name, term: index < 2 ? 'TERM_1' : 'TERM_2' },
      status: index % 2 === 0 ? 'submitted' : 'draft',
      score_count: 18 + index,
      entered_by_name: index % 2 === 0 ? 'Daniel Brooks' : 'Mariam Stone',
      submitted_at: index % 2 === 0 ? new Date(Date.now() - index * 86400000).toISOString() : null,
      approved_at: null,
      rejection_note: '',
      scores: demoStudents
        .filter(student => student.assigned_class === klass.id)
        .slice(0, 8)
        .map((student, scoreIndex) => ({
          id: scoreIndex + 1,
          student: student.id,
          student_detail: { id: student.id, full_name: student.full_name, student_id: student.student_id },
          score: String(70 + scoreIndex),
          functional_rating: null,
        })),
    }
  })
}

function dashboards(path: string) {
  const attendanceToday = { total: demoStudents.length, present: 74, absent: 6, rate: 92 }
  if (path === '/dashboard/teacher/') {
    return {
      my_classes_count: 3,
      my_students_count: 78,
      tasks: { pending_attendance: 1, homework_to_review: 7, pending_lessons: 2 },
      today_classes: demoClasses.slice(2, 5).map((klass, index) => ({
        id: klass.id,
        name: klass.name,
        grade_level: klass.grade_level,
        time: `${8 + index}:00 AM`,
      })),
      alerts: [
        { id: 1, type: 'homework', title: 'Homework submissions ready for grading' },
        { id: 2, type: 'attendance', title: 'Grade 3 attendance pending' },
      ],
    }
  }
  if (path === '/dashboard/parent/') {
    return { children: parentChildren() }
  }
  if (path === '/dashboard/coordinator/') {
    return {
      total_students: demoStudents.length,
      attendance_today: attendanceToday,
      pending_lesson_plans: 3,
      pending_plans: demoLessonPlans.filter(plan => plan.status === 'submitted').slice(0, 5),
      at_risk_count: 6,
      at_risk_breakdown: { absence: 2, low_grades: 3, no_grades: 1 },
      at_risk_students: demoStudents.slice(4, 10).map(student => ({
        id: student.id,
        name: student.full_name,
        student_id: student.student_id,
        class: student.assigned_class_detail.name,
        grade_level: student.assigned_class_detail.grade_level,
        risk_reasons: ['Attendance trend', 'Recent grade drop'],
      })),
      recent_activity: recentActivity(),
    }
  }
  return {
    total_students: demoStudents.length,
    total_teachers: demoTeachers.length,
    students_inactive: 4,
    students_joined_this_month: 9,
    teachers_joined_this_month: 1,
    attendance_today: attendanceToday,
    at_risk_count: 6,
    at_risk_breakdown: { absence: 2, low_grades: 3, no_grades: 1 },
    pending_lesson_plans: 3,
    recent_activity: recentActivity(),
  }
}

function recentActivity() {
  return [
    {
      id: 1,
      actor: 'Daniel Brooks',
      action: 'submitted_lesson_plan',
      description: 'submitted a Grade 4 Mathematics lesson plan',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 2,
      actor: 'Mariam Stone',
      action: 'marked_attendance',
      description: 'completed attendance for Form 1 Newton',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 3,
      actor: 'Amira Hassan',
      action: 'created_homework',
      description: 'published Science practice homework',
      created_at: new Date(Date.now() - 10800000).toISOString(),
    },
  ]
}

function conversations() {
  return demoUsers
    .filter(user => user.email !== 'admin@demo.school')
    .map((user, index) => ({
      user_id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      role_display: user.role ? user.role[0].toUpperCase() + user.role.slice(1) : 'User',
      last_message_preview: index === 0 ? 'Can we review the assessment dashboard?' : 'Thank you for the update.',
      last_message_at: new Date(Date.now() - index * 3600000).toISOString(),
      unread_count: index === 0 ? 2 : 0,
      teaching_subjects: user.role === 'teacher' ? ['Mathematics', 'Science'] : [],
    }))
}

function messageContacts() {
  return demoUsers.map(user => {
    const [firstName = '', lastName = ''] = user.full_name.split(' ')
    return {
      id: user.id,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      full_name: user.full_name,
      role: user.role,
      role_display: user.role ? user.role[0].toUpperCase() + user.role.slice(1) : 'User',
      teaching_subjects: user.role === 'teacher' ? ['Mathematics', 'Science'] : [],
    }
  })
}

function chatThread(params: Params) {
  const otherId = numberParam(params, 'with_user') ?? 2
  return [
    {
      id: 1,
      sender: otherId,
      recipient: 1,
      body: 'Hello, the demo data is ready for review.',
      created_at: new Date(Date.now() - 5400000).toISOString(),
      is_read: true,
    },
    {
      id: 2,
      sender: 1,
      recipient: otherId,
      body: 'Great. I will check the dashboard and reports.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      is_read: true,
    },
  ]
}

function transportStats() {
  return {
    total_routes: 3,
    active_routes: 3,
    inactive_routes: 0,
    total_capacity_active: 120,
    students_on_bus: 82,
    students_not_on_bus: demoStudents.length - 82,
    total_active_students: demoStudents.length,
    seats_available: 38,
    by_route: demoBusRoutes.map(route => ({
      id: route.id,
      name: route.name,
      capacity: route.capacity,
      assigned: route.assigned_count,
      available: route.capacity - (route.assigned_count ?? 0),
    })),
  }
}

const demoBusRoutes = [
  {
    id: 1,
    name: 'North Route',
    driver_name: 'Peter Allen',
    driver_phone: '+1 555 0301',
    area_description: 'North district and lakeside neighborhoods',
    capacity: 40,
    is_active: true,
    notes: '',
    assigned_count: 28,
  },
  {
    id: 2,
    name: 'Central Route',
    driver_name: 'Fatima Noor',
    driver_phone: '+1 555 0302',
    area_description: 'Downtown and central residential areas',
    capacity: 45,
    is_active: true,
    notes: '',
    assigned_count: 31,
  },
  {
    id: 3,
    name: 'East Route',
    driver_name: 'Michael Chen',
    driver_phone: '+1 555 0303',
    area_description: 'East gardens and airport road',
    capacity: 35,
    is_active: true,
    notes: '',
    assigned_count: 23,
  },
]

function handleGet(path: string, params: Params): DemoPayload {
  if (path.startsWith('/dashboard/parent/children/')) {
    const id = Number(path.split('/').filter(Boolean).at(-1))
    return parentChildDetail(id)
  }
  if (path.startsWith('/dashboard/')) return dashboards(path)
  if (path === '/classes/grade-levels/') return { grade_levels: GRADE_LEVELS }
  if (path === '/classes/') return paginated(demoClasses)
  if (path === '/subjects/') {
    const classId = numberParam(params, 'assigned_class')
    const grade = textParam(params, 'grade_level')
    let subjects = demoSubjects
    if (classId) subjects = subjects.filter(subject => subject.assigned_class === classId || subject.assigned_class === null)
    if (grade) {
      const classIds = demoClasses.filter(klass => klass.grade_level === grade).map(klass => klass.id)
      subjects = subjects.filter(subject => subject.assigned_class == null || classIds.includes(subject.assigned_class))
    }
    return paginated(subjects)
  }
  if (path === '/students/at-risk/') return demoStudents.slice(4, 10)
  if (path === '/students/') return paginated(withClassFilter(params))
  if (path.startsWith('/students/') && path.endsWith('/parents/')) return demoParents
  if (path.startsWith('/students/')) {
    const id = Number(path.split('/').filter(Boolean).at(-1))
    return demoStudents.find(student => student.id === id) ?? demoStudents[0]
  }
  if (path === '/teachers/') return paginated(demoTeachers)
  if (path === '/parents/lookup/') return { found: false, parent: null }
  if (path === '/parents/') return paginated(demoParents)
  if (path === '/users/') return paginated(demoUsers)
  if (path === '/roles/') return demoRoles
  if (path === '/attendance/report/') return attendanceReport()
  if (path === '/attendance/') return paginated(demoAttendance)
  if (path === '/homeworks/') return paginated(demoHomeworks)
  if (path.includes('/submissions/')) {
    return demoStudents.slice(0, 10).map((student, index) => ({
      id: index + 1,
      student_detail: { id: student.id, first_name: student.first_name, last_name: student.last_name },
      status: index % 3 === 0 ? 'graded' : 'submitted',
      score: index % 3 === 0 ? 17 : null,
      feedback: index % 3 === 0 ? 'Well done.' : '',
      submitted_at: new Date(Date.now() - index * 3600000).toISOString(),
      file_url: null,
    }))
  }
  if (path === '/lesson-plans/' || path === '/lesson-plans/for-parent/') return paginated(demoLessonPlans)
  if (path === '/assessment-types/') return paginated(demoAssessmentTypes)
  if (path === '/exams/') return paginated(demoExams)
  if (path === '/grades/') return paginated(demoGrades)
  if (path === '/score-sheets/matrix/') return matrix(params)
  if (path === '/score-sheets/') return paginated(scoreSheets())
  if (path.startsWith('/score-sheets/') && path !== '/score-sheets/bulk-template/') {
    const id = Number(path.split('/').filter(Boolean).at(1))
    return scoreSheets().find(sheet => sheet.id === id) ?? scoreSheets()[0]
  }
  if (path === '/score-sheets/bulk-template/') return 'student_id,student_name,score\nSTD-0001,Lina Khan,85'
  if (path === '/subject-exams/') return []
  if (path === '/structured-grades/') return []
  if (path === '/notifications/unread-count/') return { count: demoNotifications.filter(item => !item.is_read).length }
  if (path === '/notifications/') return paginated(demoNotifications)
  if (path === '/chat/conversations/') return conversations()
  if (path === '/message-contacts/') return messageContacts()
  if (path === '/chat/messages/') return chatThread(params)
  if (path === '/transport/bus-routes/stats/') return transportStats()
  if (path === '/transport/bus-routes/') return paginated(demoBusRoutes)
  return paginated([])
}

function handleWrite(path: string, config: InternalAxiosRequestConfig): DemoPayload {
  if (path === '/auth/login/') {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) as { email?: string; password?: string } : {}
    const user = DEMO_USERS.find(item => item.email.toLowerCase() === body.email?.toLowerCase())
    if (!user || body.password !== DEMO_PASSWORD) {
      return { detail: 'Invalid demo credentials' }
    }
    return {
      user,
      access: `demo-access-${user.id}`,
      refresh: `demo-refresh-${user.id}`,
    }
  }
  if (path === '/chat/broadcast/') return { sent: demoUsers.length }
  if (path === '/attendance/bulk-mark/') return { detail: 'Demo attendance saved' }
  if (path === '/score-sheets/save/') return { id: 1, detail: 'Demo scores saved' }
  if (path.includes('/parent-submit/')) return { detail: 'Demo homework submitted' }
  return { id: Date.now(), detail: 'Demo action completed' }
}

export function installDemoApi(api: AxiosInstance): void {
  const adapter: AxiosAdapter = async config => {
    await wait(180)
    const path = normalizePath(config.url)
    const method = (config.method ?? 'get').toLowerCase()
    const data = method === 'get' ? handleGet(path, paramsOf(config)) : handleWrite(path, config)
    const isBadLogin = path === '/auth/login/' && method !== 'get' && 'detail' in (data as object)
    return response(config, data, isBadLogin ? 401 : 200)
  }

  api.defaults.adapter = adapter
}

