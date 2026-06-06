import type { SessionUser } from '../lib/tabSession'

export const DEMO_PASSWORD = 'demo12345'

export const DEMO_SCOPES = [
  'students.read',
  'students.manage',
  'teachers.read',
  'teachers.manage',
  'parents.read',
  'parents.manage',
  'attendance.read',
  'attendance.manage',
  'homework.read',
  'homework.manage',
  'lessonplans.read',
  'lessonplans.manage',
  'lessonplans.approve',
  'grades.read',
  'grades.manage',
  'scores.approve',
  'reports.read',
  'users.manage',
  'children.read',
]

export const DEMO_USERS: SessionUser[] = [
  {
    id: 1,
    email: 'admin@demo.school',
    full_name: 'Amira Hassan',
    role: 'admin',
    scopes: DEMO_SCOPES,
  },
  {
    id: 2,
    email: 'teacher@demo.school',
    full_name: 'Daniel Brooks',
    role: 'teacher',
    scopes: [
      'students.read',
      'attendance.read',
      'attendance.manage',
      'homework.read',
      'homework.manage',
      'lessonplans.read',
      'lessonplans.manage',
      'grades.read',
      'grades.manage',
    ],
  },
  {
    id: 3,
    email: 'parent@demo.school',
    full_name: 'Nadia Karim',
    role: 'parent',
    scopes: ['children.read', 'attendance.read', 'homework.read', 'lessonplans.read', 'grades.read'],
  },
  {
    id: 4,
    email: 'coordinator@demo.school',
    full_name: 'Omar Wallace',
    role: 'coordinator',
    scopes: [
      'students.read',
      'teachers.read',
      'attendance.read',
      'homework.read',
      'lessonplans.read',
      'lessonplans.approve',
      'grades.read',
      'grades.manage',
      'scores.approve',
      'reports.read',
    ],
  },
]

export const DEMO_CREDENTIALS = DEMO_USERS.map(user => ({
  role: user.role ?? 'user',
  email: user.email,
  password: DEMO_PASSWORD,
}))

export const GRADE_LEVELS = [
  'KG1',
  'KG2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
]

export interface DemoClass {
  id: number
  name: string
  grade_level: string
  section: string
  academic_year: string
  capacity: number
}

export interface DemoSubject {
  id: number
  name: string
  code: string
  description: string
  assigned_class: number | null
  assigned_class_detail?: { id: number; name: string }
}

export interface DemoStudent {
  id: number
  student_id: string
  first_name: string
  last_name: string
  full_name: string
  date_of_birth: string
  gender: string
  assigned_class: number
  assigned_class_detail: { id: number; name: string; grade_level: string }
  photo: string | null
  medical_notes: string
  behavior_notes: string
  is_active: boolean
  created_at: string
}

const currentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
const classNames = [
  'Maple',
  'Cedar',
  'Oak',
  'Falcon',
  'Orion',
  'Atlas',
  'Nova',
  'Summit',
  'River',
  'Phoenix',
  'Newton',
  'Darwin',
  'Curie',
  'Turing',
]

export const demoClasses: DemoClass[] = GRADE_LEVELS.map((grade, index) => ({
  id: index + 1,
  name: `${grade} ${classNames[index]}`,
  grade_level: grade,
  section: classNames[index],
  academic_year: currentYear,
  capacity: index < 2 ? 24 : index < 10 ? 30 : 28,
}))

const subjectTemplates = [
  ['English Language', 'ENG'],
  ['Mathematics', 'MATH'],
  ['Science', 'SCI'],
  ['Social Studies', 'SOC'],
  ['Digital Skills', 'ICT'],
]

export const demoSubjects: DemoSubject[] = demoClasses.flatMap((klass, classIndex) =>
  subjectTemplates.slice(0, classIndex < 2 ? 3 : 5).map(([name, code], subjectIndex) => ({
    id: classIndex * 10 + subjectIndex + 1,
    name,
    code: `${code}-${klass.id}`,
    description: `${name} curriculum for ${klass.grade_level}`,
    assigned_class: klass.id,
    assigned_class_detail: { id: klass.id, name: klass.name },
  })),
)

const firstNames = [
  'Lina',
  'Adam',
  'Maya',
  'Youssef',
  'Sara',
  'Noah',
  'Leila',
  'Karim',
  'Hana',
  'Elias',
  'Nour',
  'Zain',
  'Ava',
  'Leo',
]
const lastNames = ['Khan', 'Morgan', 'Haddad', 'Patel', 'Ali', 'Chen', 'Brown', 'Saleh', 'Walker', 'Nasser']

export const demoStudents: DemoStudent[] = demoClasses.flatMap((klass, classIndex) =>
  Array.from({ length: classIndex < 2 ? 5 : 6 }, (_, offset) => {
    const id = classIndex * 10 + offset + 1
    const first = firstNames[(classIndex + offset) % firstNames.length]
    const last = lastNames[(classIndex * 2 + offset) % lastNames.length]
    return {
      id,
      student_id: `STD-${String(id).padStart(4, '0')}`,
      first_name: first,
      last_name: last,
      full_name: `${first} ${last}`,
      date_of_birth: `${2018 - Math.min(classIndex, 12)}-${String((offset % 9) + 1).padStart(2, '0')}-15`,
      gender: offset % 2 === 0 ? 'female' : 'male',
      assigned_class: klass.id,
      assigned_class_detail: { id: klass.id, name: klass.name, grade_level: klass.grade_level },
      photo: null,
      medical_notes: offset === 2 ? 'Mild allergy noted' : '',
      behavior_notes: '',
      is_active: true,
      created_at: new Date(Date.now() - id * 86400000).toISOString(),
    }
  }),
)

export const demoTeachers = [
  {
    id: 1,
    employee_id: 'TCH-001',
    user: { id: 2, full_name: 'Daniel Brooks', email: 'teacher@demo.school' },
    subjects: [21, 31, 101],
    subjects_detail: [
      { id: 21, name: 'English Language' },
      { id: 31, name: 'English Language' },
      { id: 101, name: 'English Language' },
    ],
    classes: [3, 4, 11],
    classes_detail: [
      { id: 3, name: 'Grade 1 Oak' },
      { id: 4, name: 'Grade 2 Falcon' },
      { id: 11, name: 'Form 1 Newton' },
    ],
    phone: '+1 555 0102',
    qualification: 'B.Ed Mathematics',
    specialization: 'Mathematics',
    joined_date: '2021-09-01',
    is_active: true,
  },
  {
    id: 2,
    employee_id: 'TCH-002',
    user: { id: 5, full_name: 'Mariam Stone', email: 'mariam.stone@demo.school' },
    subjects: [62, 72, 112],
    subjects_detail: [
      { id: 62, name: 'Mathematics' },
      { id: 72, name: 'Mathematics' },
      { id: 112, name: 'Mathematics' },
    ],
    classes: [7, 8, 12],
    classes_detail: [
      { id: 7, name: 'Grade 5 Nova' },
      { id: 8, name: 'Grade 6 Summit' },
      { id: 12, name: 'Form 2 Darwin' },
    ],
    phone: '+1 555 0105',
    qualification: 'M.Sc Science',
    specialization: 'Science',
    joined_date: '2019-03-15',
    is_active: true,
  },
  {
    id: 3,
    employee_id: 'TCH-003',
    user: { id: 6, full_name: 'George Miller', email: 'george.miller@demo.school' },
    subjects: [1, 11, 21],
    subjects_detail: [
      { id: 1, name: 'English Language' },
      { id: 11, name: 'English Language' },
      { id: 21, name: 'English Language' },
    ],
    classes: [1, 2, 3],
    classes_detail: [
      { id: 1, name: 'KG1 Maple' },
      { id: 2, name: 'KG2 Cedar' },
      { id: 3, name: 'Grade 1 Oak' },
    ],
    phone: '+1 555 0106',
    qualification: 'B.Ed Primary',
    specialization: 'Primary Years',
    joined_date: '2020-01-10',
    is_active: true,
  },
]

export const demoParents = [
  {
    id: 1,
    user: 3,
    full_name: 'Nadia Karim',
    email: 'parent@demo.school',
    phone: '+1 555 0201',
    relationship: 'Mother',
    children: [demoStudents[2]?.id, demoStudents[33]?.id].filter(Boolean),
    is_active: true,
  },
  {
    id: 2,
    user: 7,
    full_name: 'Samir Haddad',
    email: 'samir.haddad@demo.school',
    phone: '+1 555 0202',
    relationship: 'Father',
    children: [demoStudents[5]?.id].filter(Boolean),
    is_active: true,
  },
]

export const demoRoles = [
  { id: 1, name: 'admin', scopes: DEMO_SCOPES },
  { id: 2, name: 'teacher', scopes: DEMO_USERS[1].scopes },
  { id: 3, name: 'parent', scopes: DEMO_USERS[2].scopes },
  { id: 4, name: 'coordinator', scopes: DEMO_USERS[3].scopes },
]

export const demoUsers = [
  ...DEMO_USERS.map(user => ({ ...user, is_active: true })),
  {
    id: 5,
    email: 'mariam.stone@demo.school',
    full_name: 'Mariam Stone',
    role: 'teacher',
    scopes: DEMO_USERS[1].scopes,
    is_active: true,
  },
  {
    id: 6,
    email: 'george.miller@demo.school',
    full_name: 'George Miller',
    role: 'teacher',
    scopes: DEMO_USERS[1].scopes,
    is_active: true,
  },
]

export const demoAssessmentTypes = [
  { id: 1, name: 'Classwork', weight: 20, max_score: 20, is_active: true, applicable_grade_levels: GRADE_LEVELS },
  { id: 2, name: 'Homework', weight: 20, max_score: 20, is_active: true, applicable_grade_levels: GRADE_LEVELS },
  { id: 3, name: 'Mid Term', weight: 25, max_score: 100, is_active: true, applicable_grade_levels: GRADE_LEVELS },
  { id: 4, name: 'Final Exam', weight: 35, max_score: 100, is_active: true, applicable_grade_levels: GRADE_LEVELS },
]

export const demoHomeworks = demoClasses.slice(2, 12).map((klass, index) => {
  const subject = demoSubjects.find(s => s.assigned_class === klass.id) ?? demoSubjects[0]
  return {
    id: index + 1,
    title: `${subject.name} practice task`,
    description: `Complete the weekly activity for ${klass.name}.`,
    subject: subject.id,
    subject_detail: { id: subject.id, name: subject.name },
    subject__name: subject.name,
    assigned_class: klass.id,
    class_detail: { id: klass.id, name: klass.name },
    due_date: new Date(Date.now() + (index + 2) * 86400000).toISOString().slice(0, 10),
    created_at: new Date(Date.now() - index * 86400000).toISOString(),
    status: index % 3 === 0 ? 'draft' : 'published',
    max_score: 20,
    submission_count: 12 + index,
    created_by_name: index % 2 === 0 ? 'Daniel Brooks' : 'Mariam Stone',
    progress_percent: 58 + index * 3,
  }
})

export const demoLessonPlans = demoClasses.slice(2, 12).map((klass, index) => {
  const subject = demoSubjects.find(s => s.assigned_class === klass.id) ?? demoSubjects[0]
  const statuses = ['draft', 'submitted', 'coordinator_approved', 'admin_approved']
  return {
    id: index + 1,
    title: `${klass.grade_level} ${subject.name} weekly plan`,
    teacher_name: index % 2 === 0 ? 'Daniel Brooks' : 'Mariam Stone',
    subject: subject.id,
    subject_detail: { id: subject.id, name: subject.name },
    subject_name: subject.name,
    assigned_class: klass.id,
    class_detail: { id: klass.id, name: klass.name },
    class_name: klass.name,
    status: statuses[index % statuses.length],
    objectives: 'Students will apply core concepts through guided practice and discussion.',
    activities: 'Warm-up, direct instruction, group activity, independent reflection.',
    materials: 'Workbook, projector, manipulatives, online quiz.',
    week_start: '2026-04-27',
    week_end: '2026-05-01',
    attachment: null,
  }
})

export const demoAttendance = demoStudents.slice(0, 60).map((student, index) => ({
  id: index + 1,
  student: student.id,
  student_detail: { id: student.id, first_name: student.first_name, last_name: student.last_name },
  date: new Date().toISOString().slice(0, 10),
  status: index % 13 === 0 ? 'absent' : index % 7 === 0 ? 'late' : 'present',
  notes: '',
}))

export const demoGrades = demoStudents.slice(0, 50).flatMap((student, index) =>
  ['Mathematics', 'English Language', 'Science'].map((subject, subjectIndex) => ({
    id: index * 10 + subjectIndex + 1,
    student: student.id,
    student_detail: { id: student.id, first_name: student.first_name, last_name: student.last_name },
    exam: subjectIndex + 1,
    exam_detail: { id: subjectIndex + 1, title: `${subject} Mid Term`, max_score: 100 },
    subject,
    score: 68 + ((index + subjectIndex * 7) % 28),
    max_score: 100,
    percentage: 68 + ((index + subjectIndex * 7) % 28),
    date: '2026-04-20',
  })),
)

export const demoExams = demoAssessmentTypes.map(type => ({
  id: type.id,
  title: type.name,
  exam_type: type.name,
  max_score: type.max_score,
  date: '2026-04-20',
}))

export const demoNotifications = [
  {
    id: 1,
    title: 'Lesson plan awaiting review',
    message: 'Grade 4 Mathematics weekly plan is ready for approval.',
    level: 'info',
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    title: 'Attendance completed',
    message: 'Today attendance was submitted for 12 classes.',
    level: 'success',
    is_read: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
]

