import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, FileDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Table } from '../../../components/ui/Table'
import { TeacherWorkspaceShell } from '../../../components/teacher/TeacherWorkspaceShell'
import { formatDate } from '../../../utils/format'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'
import { downloadHomeworkDocx, downloadHomeworkPdf, type HomeworkExportSource } from '../../../utils/homeworkExport'
import { SCHOOL_NAME_EXPORT } from '../../../constants/school'

interface Homework {
  id: number
  title: string
  description: string
  subject_detail: { id: number; name: string }
  class_detail: { id: number; name: string }
  due_date: string
  status?: string
  submission_count: number
  progress_percent?: number
}

const tableShell =
  'overflow-x-auto rounded-xl border border-white/60 bg-white/85 shadow-sm backdrop-blur-sm [&_thead]:bg-indigo-50/70 [&_th]:text-indigo-800/85 [&_tbody]:bg-white/92'

function toExportSource(hw: Homework): HomeworkExportSource {
  return {
    title: hw.title,
    description: hw.description,
    due_date: formatDate(hw.due_date),
    className: hw.class_detail?.name ?? '—',
    subjectName: hw.subject_detail?.name ?? '—',
    status: hw.status,
    submission_count: hw.submission_count,
    progress_percent: hw.progress_percent,
  }
}

export default function TeacherHomeworkHistoryPage() {
  const navigate = useNavigate()
  const { hasScope } = useAuth()
  const canManage = hasScope('homework.manage')
  const [exportingId, setExportingId] = useState<number | null>(null)
  const [exportKind, setExportKind] = useState<'pdf' | 'docx' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['homeworks', 'history'],
    queryFn: () =>
      api
        .get('/homeworks/', {
          params: { ordering: '-created_at', page_size: 200 },
        })
        .then((r) => r.data),
    enabled: canManage,
  })

  const homeworks: Homework[] = data?.results ?? data ?? []
  const visibleCount = homeworks.length

  const runExport = async (hw: Homework, kind: 'pdf' | 'docx') => {
    const payload = toExportSource(hw)
    setExportingId(hw.id)
    setExportKind(kind)
    try {
      if (kind === 'pdf') {
        downloadHomeworkPdf(payload)
      } else {
        await downloadHomeworkDocx(payload)
      }
      toast.success(kind === 'pdf' ? 'PDF downloaded' : 'Word document downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExportingId(null)
      setExportKind(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        header: 'Title',
        className: 'py-2 align-middle max-w-[12rem]',
        render: (hw: Homework) => (
          <span className="text-sm font-medium text-indigo-950">{hw.title}</span>
        ),
      },
      {
        header: 'Class',
        className: 'py-2 align-middle text-xs',
        render: (hw: Homework) => hw.class_detail?.name ?? '—',
      },
      {
        header: 'Subject',
        className: 'py-2 align-middle text-xs',
        render: (hw: Homework) => hw.subject_detail?.name ?? '—',
      },
      {
        header: 'Due',
        className: 'py-2 align-middle whitespace-nowrap text-xs',
        render: (hw: Homework) => formatDate(hw.due_date),
      },
      {
        header: 'Stats',
        className: 'py-2 align-middle',
        render: (hw: Homework) => (
          <div className="flex flex-wrap items-center gap-1">
            {hw.status === 'draft' && <Badge color="gray">Draft</Badge>}
            <Badge color="blue">{hw.submission_count} submitted</Badge>
            {typeof hw.progress_percent === 'number' && hw.submission_count > 0 && (
              <Badge color="green">{Math.round(hw.progress_percent)}%</Badge>
            )}
          </div>
        ),
      },
      {
        header: 'Export',
        className: 'py-2 align-middle w-px',
        render: (hw: Homework) => {
          const busy = exportingId === hw.id
          return (
            <div className="flex flex-wrap justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="border-indigo-200/70 text-xs"
                disabled={busy}
                onClick={() => void runExport(hw, 'pdf')}
              >
                {busy && exportKind === 'pdf' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                PDF
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="border-indigo-200/70 text-xs"
                disabled={busy}
                onClick={() => void runExport(hw, 'docx')}
              >
                {busy && exportKind === 'docx' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                Word
              </Button>
            </div>
          )
        },
      },
    ],
    [exportingId, exportKind],
  )

  if (!canManage) {
    return (
      <div className="relative -m-3 p-3 sm:-m-4 sm:p-4 md:-m-6 md:p-6">
        <p className="text-sm text-indigo-900/80">You do not have permission to view this page.</p>
      </div>
    )
  }

  return (
    <TeacherWorkspaceShell
      variant="compact"
      title="Previous homework and stats"
      subtitle={`${SCHOOL_NAME_EXPORT} · ${visibleCount} assignment${visibleCount === 1 ? '' : 's'} · PDF and Word include centered school name`}
      heroIcon={BookOpen}
      bodyClassName="flex min-h-0 flex-1 flex-col"
      heroActions={
        <Button
          type="button"
          variant="secondary"
          className="min-h-[44px] shrink-0 border-indigo-200/70 bg-white/70 text-indigo-900"
          onClick={() => navigate('/homework/create')}
        >
          New homework
        </Button>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/homework')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/55 px-3 py-1.5 text-xs font-medium text-indigo-900 shadow-sm backdrop-blur-sm transition hover:bg-white/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to my homework
        </button>
      </div>
      <div className="max-h-[calc(100vh-12.5rem)] min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto">
        <Table<Homework>
          loading={isLoading}
          emptyMessage="No homework to show yet."
          wrapperClassName={tableShell}
          columns={columns}
          data={homeworks}
        />
      </div>
    </TeacherWorkspaceShell>
  )
}