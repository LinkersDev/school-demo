import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, ClipboardList, BarChart2 } from 'lucide-react'
import { studentsService } from '../services/students.service'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { StatusBadge } from '../../../components/ui/Badge'
import { formatDate } from '../../../utils/format'
import api from '../../../services/api'

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const studentId = Number(id)

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentsService.get(studentId),
  })

  const { data: attendance } = useQuery({
    queryKey: ['student-attendance', studentId],
    queryFn: () => api.get('/attendance/', { params: { student: studentId } }).then(r => r.data),
    enabled: !!studentId,
  })

  const { data: grades } = useQuery({
    queryKey: ['student-grades', studentId],
    queryFn: () => api.get('/grades/', { params: { student: studentId } }).then(r => r.data),
    enabled: !!studentId,
  })

  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading...</div>
  if (!student) return <div className="text-center py-20 text-gray-500">Student not found</div>

  const attendanceList = attendance?.results ?? attendance ?? []
  const gradesList = grades?.results ?? grades ?? []

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link to="/students" className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
          <p className="text-sm text-gray-500">{student.student_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1">
          <CardHeader><h3 className="font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Profile</h3></CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-center pb-3">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold">
                {student.first_name[0]}
              </div>
            </div>
            {[
              ['Full Name', student.full_name],
              ['Student ID', student.student_id],
              ['Gender', student.gender],
              ['Class', student.assigned_class_detail?.name ?? '-'],
              ['Grade', student.assigned_class_detail?.grade_level ?? '-'],
              ['Status', student.is_active ? 'Active' : 'Inactive'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
            {student.date_of_birth && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date of Birth</span>
                <span className="font-medium">{formatDate(student.date_of_birth)}</span>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-5">
          {student.medical_notes && (
            <Card>
              <CardHeader><h3 className="font-semibold text-red-600">Medical Notes</h3></CardHeader>
              <CardBody><p className="text-sm text-gray-700">{student.medical_notes}</p></CardBody>
            </Card>
          )}
          {student.behavior_notes && (
            <Card>
              <CardHeader><h3 className="font-semibold text-orange-600">Behavior Notes</h3></CardHeader>
              <CardBody><p className="text-sm text-gray-700">{student.behavior_notes}</p></CardBody>
            </Card>
          )}

          <Card>
            <CardHeader><h3 className="font-semibold flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Recent Attendance</h3></CardHeader>
            <div className="divide-y divide-gray-50">
              {attendanceList.slice(0, 7).map((a: { id: number; date: string; status: string }) => (
                <div key={a.id} className="px-6 py-3 flex justify-between text-sm">
                  <span className="text-gray-600">{formatDate(a.date)}</span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
              {attendanceList.length === 0 && <div className="px-6 py-4 text-sm text-gray-400">No attendance records</div>}
            </div>
          </Card>

          <Card>
            <CardHeader><h3 className="font-semibold flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Recent Grades</h3></CardHeader>
            <div className="divide-y divide-gray-50">
              {gradesList.slice(0, 5).map((g: { id: number; exam_name: string; score: number; max_score: number; percentage: number }) => (
                <div key={g.id} className="px-6 py-3 flex justify-between text-sm">
                  <span className="text-gray-700">{g.exam_name}</span>
                  <span className="font-medium">{g.score} / {g.max_score} <span className="text-gray-400">({g.percentage}%)</span></span>
                </div>
              ))}
              {gradesList.length === 0 && <div className="px-6 py-4 text-sm text-gray-400">No grades recorded</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
