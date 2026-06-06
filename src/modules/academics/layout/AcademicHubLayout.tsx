import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'

import { cn } from '../../../utils/cn'

import { useAuth } from '../../../hooks/useAuth'

import { AcademicFilterProvider, useAcademicFilter } from '../context/AcademicFilterContext'

import AcademicFilterBar from '../components/AcademicFilterBar'

import { academicFilterSearch } from '../utils/academicFilterQuery'



function AcademicHubNav() {

  const { grade, classId, subjectId } = useAcademicFilter()

  const qs = academicFilterSearch(grade, classId, subjectId)



  const tabs: { href: string; label: string; end?: boolean }[] = [

    { href: `/academics/dashboard${qs}`, label: 'Dashboard', end: true },

    { href: `/academics/class-results${qs}`, label: 'All student grades' },

  ]



  return (

    <nav className="-mx-1 overflow-x-auto border-b border-gray-200">

      <div className="flex min-w-0 gap-0 px-1">

        {tabs.map(t => (

          <NavLink

            key={t.href}

            to={t.href}

            end={Boolean(t.end)}

            className={({ isActive }) =>

              cn(

                'shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-5',

                isActive

                  ? 'border-blue-600 text-blue-600'

                  : 'border-transparent text-gray-500 hover:text-blue-700 hover:border-blue-200',

              )

            }

          >

            {t.label}

          </NavLink>

        ))}

      </div>

    </nav>

  )

}



function TeacherAcademicRedirect() {

  const location = useLocation()

  const search = location.search || ''

  if (

    location.pathname === '/academics/dashboard' ||

    location.pathname === '/academics/class-results'

  ) {

    return <Navigate to={`/academics/teacher-upload${search}`} replace />

  }

  return null

}



export default function AcademicHubLayout() {

  const { user } = useAuth()

  const isTeacher = (user?.role ?? '').toLowerCase() === 'teacher'



  return (

    <AcademicFilterProvider>

      <div className="mx-auto max-w-6xl min-w-0 space-y-5 px-2 py-4 sm:px-4">

        {isTeacher ? <TeacherAcademicRedirect /> : null}

        <header>

          {isTeacher ? (

            <>

              <h1 className="text-2xl font-bold text-gray-900">Upload grades</h1>

              <p className="mt-1 text-sm text-gray-500">

                Select grade, class, and subject below. Download the CSV template, fill scores, then upload. Draft sheets

                are submitted for approval by your head of academics.

              </p>

            </>

          ) : (

            <>

              <h1 className="text-2xl font-bold text-gray-900">Academic / Assessment</h1>

              <p className="mt-1 text-sm text-gray-500">

                Score sheets, class grades, and reports — filters apply to every tab.

              </p>

            </>

          )}

        </header>



        <AcademicFilterBar />



        {!isTeacher ? <AcademicHubNav /> : null}



        <Outlet />

      </div>

    </AcademicFilterProvider>

  )

}


