import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Layout from '../components/layout/Layout'
import CoordinatorLayout from '../layouts/CoordinatorLayout'
import RoleGuard from '../components/layout/RoleGuard'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import AdminDashboard from '../pages/dashboards/AdminDashboard'
import TeacherDashboard from '../pages/dashboards/TeacherDashboard'
import ParentDashboard from '../pages/dashboards/ParentDashboard'
import TeacherMyClassesPage from '../pages/TeacherMyClassesPage'
import StudentsPage from '../modules/students/pages/StudentsPage'
import StudentDetailPage from '../modules/students/pages/StudentDetailPage'
import AtRiskPage from '../modules/students/pages/AtRiskPage'
import TeachersPage from '../modules/teachers/pages/TeachersPage'
import ParentsPage from '../modules/parents/pages/ParentsPage'
import AttendancePage from '../modules/attendance/pages/AttendancePage'
import HomeworkPage from '../modules/homework/pages/HomeworkPage'
import CreateHomeworkPage from '../modules/homework/pages/CreateHomeworkPage'
import TeacherHomeworkHistoryPage from '../modules/homework/pages/TeacherHomeworkHistoryPage'
import LessonPlansPage from '../modules/lessonPlans/pages/LessonPlansPage'
import TeacherLessonPlansPage from '../modules/lessonPlans/pages/TeacherLessonPlansPage'
import TeacherLessonPlansHistoryPage from '../modules/lessonPlans/pages/TeacherLessonPlansHistoryPage'
import GradingExplorerPage from '../modules/grades/pages/GradingExplorerPage'
import GradesPage from '../modules/grades/pages/GradesPage'
import AcademicHubLayout from '../modules/academics/layout/AcademicHubLayout'
import AcademicGradesDashboardPage from '../modules/academics/pages/AcademicGradesDashboardPage'
import AcademicClassResultsPage from '../modules/academics/pages/AcademicClassResultsPage'
import TeacherUploadGradesPage from '../modules/academics/pages/TeacherUploadGradesPage'
import AcademicsIndexRedirect from '../modules/academics/pages/AcademicsIndexRedirect'
import AdminHomeworkExplorerPage from '../pages/AdminHomeworkExplorerPage'
import UsersPage from '../pages/UsersPage'
import ClassesPage from '../pages/ClassesPage'
import NotificationsPage from '../pages/NotificationsPage'
import AssessmentTypesPage from '../pages/AssessmentTypesPage'
import TransportationPage from '../pages/TransportationPage'
import MessagesPage from '../pages/MessagesPage'
import StaffOnlyAcademic from '../components/layout/StaffOnlyAcademic'
import ParentAttendancePage from '../modules/parent/pages/ParentAttendancePage'
import ParentHomeworkPage from '../modules/parent/pages/ParentHomeworkPage'
import ParentGradesPage from '../modules/parent/pages/ParentGradesPage'
import ParentLessonPlansPage from '../modules/parent/pages/ParentLessonPlansPage'
import CoordinatorDashboard from '../modules/dashboard/pages/CoordinatorDashboard'
import LessonPlansDetailRedirect from './LessonPlansDetailRedirect'
import MyLessonPlansIdRedirect from './MyLessonPlansIdRedirect'

function RootLayout() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'coordinator') return <CoordinatorLayout />
  return <Layout />
}

function TransportationEntry() {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'teacher') return <Navigate to="/dashboard/teacher" replace />
  return <TransportationPage />
}

function RoleRedirect() {
  const user = useAuthStore.getState().user
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/dashboard/admin" replace />
  if (user.role === 'coordinator') return <Navigate to="/dashboard/coordinator" replace />
  if (user.role === 'teacher') return <Navigate to="/dashboard/teacher" replace />
  if (user.role === 'parent') return <Navigate to="/dashboard/parent" replace />
  return <Navigate to="/dashboard/admin" replace />
}

function LessonPlansEntry() {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'teacher') return <Navigate to="/my-lesson-plans" replace />
  return <LessonPlansPage />
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <RoleRedirect /> },

      // ── Dashboards ──────────────────────────────────────────────────────────
      {
        path: 'dashboard/admin',
        element: (
          <RoleGuard scopes={['students.read']} roles={['admin']}>
            <AdminDashboard />
          </RoleGuard>
        ),
      },
      {
        path: 'dashboard/coordinator',
        element: (
          <RoleGuard roles={['coordinator']}>
            <CoordinatorDashboard />
          </RoleGuard>
        ),
      },
      {
        path: 'dashboard/teacher',
        element: (
          <RoleGuard roles={['teacher']}>
            <TeacherDashboard />
          </RoleGuard>
        ),
      },
      {
        path: 'my-classes',
        element: (
          <RoleGuard roles={['teacher']}>
            <TeacherMyClassesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'dashboard/parent',
        element: (
          <RoleGuard roles={['parent']}>
            <ParentDashboard />
          </RoleGuard>
        ),
      },
      {
        path: 'parent/attendance',
        element: (
          <RoleGuard roles={['parent']} scopes={['attendance.read']}>
            <ParentAttendancePage />
          </RoleGuard>
        ),
      },
      {
        path: 'parent/homework',
        element: (
          <RoleGuard roles={['parent']} scopes={['homework.read']}>
            <ParentHomeworkPage />
          </RoleGuard>
        ),
      },
      {
        path: 'parent/grades',
        element: (
          <RoleGuard roles={['parent']} scopes={['grades.read']}>
            <ParentGradesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'parent/lesson-plans',
        element: (
          <RoleGuard roles={['parent']} scopes={['lessonplans.read']}>
            <ParentLessonPlansPage />
          </RoleGuard>
        ),
      },

      // ── Student Records ─────────────────────────────────────────────────────
      {
        path: 'students',
        element: (
          <RoleGuard scopes={['students.read']}>
            <StudentsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'students/at-risk',
        element: (
          <RoleGuard scopes={['students.read']}>
            <AtRiskPage />
          </RoleGuard>
        ),
      },
      {
        path: 'students/:id',
        element: (
          <RoleGuard scopes={['students.read']}>
            <StudentDetailPage />
          </RoleGuard>
        ),
      },

      // ── People Management ───────────────────────────────────────────────────
      {
        path: 'teachers',
        element: (
          <RoleGuard scopes={['teachers.read']}>
            <TeachersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'parents',
        element: (
          <RoleGuard scopes={['parents.read']}>
            <ParentsPage />
          </RoleGuard>
        ),
      },

      // ── Academics ───────────────────────────────────────────────────────────
      {
        path: 'attendance',
        element: (
          <RoleGuard scopes={['attendance.read']}>
            <StaffOnlyAcademic>
              <AttendancePage />
            </StaffOnlyAcademic>
          </RoleGuard>
        ),
      },
      {
        path: 'homework',
        element: (
          <RoleGuard scopes={['homework.read']}>
            <StaffOnlyAcademic>
              <HomeworkPage />
            </StaffOnlyAcademic>
          </RoleGuard>
        ),
      },
      {
        path: 'homework/create',
        element: (
          <RoleGuard scopes={['homework.manage']}>
            <StaffOnlyAcademic>
              <CreateHomeworkPage />
            </StaffOnlyAcademic>
          </RoleGuard>
        ),
      },
      {
        path: 'homework/history',
        element: (
          <RoleGuard scopes={['homework.manage']}>
            <StaffOnlyAcademic>
              <TeacherHomeworkHistoryPage />
            </StaffOnlyAcademic>
          </RoleGuard>
        ),
      },
      {
        path: 'homework/:id/edit',
        element: (
          <RoleGuard scopes={['homework.manage']}>
            <StaffOnlyAcademic>
              <CreateHomeworkPage />
            </StaffOnlyAcademic>
          </RoleGuard>
        ),
      },
      {
        path: 'my-lesson-plans/history',
        element: (
          <RoleGuard scopes={['lessonplans.read']} roles={['teacher']}>
            <TeacherLessonPlansHistoryPage />
          </RoleGuard>
        ),
      },
      {
        path: 'my-lesson-plans/:planId',
        element: (
          <RoleGuard scopes={['lessonplans.read']} roles={['teacher']}>
            <MyLessonPlansIdRedirect />
          </RoleGuard>
        ),
      },
      {
        path: 'my-lesson-plans',
        element: (
          <RoleGuard scopes={['lessonplans.read']} roles={['teacher']}>
            <TeacherLessonPlansPage />
          </RoleGuard>
        ),
      },
      {
        path: 'lesson-plans/:planId',
        element: (
          <RoleGuard scopes={['lessonplans.read']}>
            <LessonPlansDetailRedirect />
          </RoleGuard>
        ),
      },
      {
        path: 'lesson-plans',
        element: (
          <RoleGuard scopes={['lessonplans.read']}>
            <LessonPlansEntry />
          </RoleGuard>
        ),
      },
      {
        path: 'grades',
        element: <Navigate to="/academics/dashboard" replace />,
      },
      {
        path: 'academics',
        element: (
          <RoleGuard scopes={['grades.read', 'grades.manage']}>
            <StaffOnlyAcademic>
              <AcademicHubLayout />
            </StaffOnlyAcademic>
          </RoleGuard>
        ),
        children: [
          { index: true, element: <AcademicsIndexRedirect /> },
          { path: 'dashboard', element: <AcademicGradesDashboardPage /> },
          { path: 'overview', element: <Navigate to="/academics/dashboard" replace /> },
          { path: 'classes', element: <Navigate to="/academics/dashboard" replace /> },
          { path: 'subjects', element: <Navigate to="/academics/dashboard" replace /> },
          { path: 'students', element: <Navigate to="/academics/dashboard" replace /> },
          { path: 'exams', element: <Navigate to="/academics/dashboard" replace /> },
          { path: 'reports', element: <Navigate to="/academics/dashboard" replace /> },
          { path: 'class-results', element: <AcademicClassResultsPage /> },
          { path: 'teacher-upload', element: <TeacherUploadGradesPage /> },
        ],
      },
      {
        path: 'grading-legacy',
        element: (
          <RoleGuard scopes={['grades.read', 'grades.manage']}>
            <StaffOnlyAcademic>
              <div className="mx-auto max-w-6xl min-w-0 space-y-5 px-2 py-4 sm:px-4">
                <GradesPage />
              </div>
            </StaffOnlyAcademic>
          </RoleGuard>
        ),
      },
      {
        path: 'grades/explorer',
        element: (
          <RoleGuard scopes={['grades.read']} roles={['admin']}>
            <StaffOnlyAcademic>
              <GradingExplorerPage />
            </StaffOnlyAcademic>
          </RoleGuard>
        ),
      },
      {
        path: 'admin/homework-explorer',
        element: (
          <RoleGuard scopes={['homework.read']} roles={['admin', 'coordinator']}>
            <StaffOnlyAcademic>
              <AdminHomeworkExplorerPage />
            </StaffOnlyAcademic>
          </RoleGuard>
        ),
      },
      {
        path: 'admin/homework-explorer/:homeworkId',
        element: (
          <RoleGuard scopes={['homework.read']} roles={['admin', 'coordinator']}>
            <StaffOnlyAcademic>
              <AdminHomeworkExplorerPage />
            </StaffOnlyAcademic>
          </RoleGuard>
        ),
      },
      {
        path: 'assessment-types',
        element: (
          <RoleGuard scopes={['grades.manage']}>
            <AssessmentTypesPage />
          </RoleGuard>
        ),
      },

      // ── Admin-only ──────────────────────────────────────────────────────────
      {
        path: 'classes',
        element: (
          <RoleGuard scopes={['students.manage', 'users.manage']}>
            <ClassesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'users',
        element: (
          <RoleGuard scopes={['users.manage']}>
            <UsersPage />
          </RoleGuard>
        ),
      },

      // ── Available to all authenticated users ────────────────────────────────
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'transportation', element: <TransportationEntry /> },
      { path: 'messages', element: <MessagesPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
