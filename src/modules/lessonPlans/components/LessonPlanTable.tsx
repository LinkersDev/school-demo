import { ClipboardCheck, Pencil, Send } from 'lucide-react'
import { formatDate } from '../../../utils/format'
import { Table } from '../../../components/ui/Table'
import type { LessonPlan } from '../lessonPlanShared'
import {
  lessonPlanStatusBadgeClass,
  lessonPlanStatusProgress,
  ProgressBar,
  tableShell,
} from '../lessonPlanShared'

export interface LessonPlanTableProps {
  data: LessonPlan[]
  loading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  /** No draft/edit/submit/review controls */
  readOnly?: boolean
  canManage?: boolean
  canApprove?: boolean
  submitPending?: boolean
  onTitleClick: (row: LessonPlan) => void
  onEditDraft?: (row: LessonPlan) => void
  onSubmit?: (row: LessonPlan) => void
  onOpenReview?: (row: LessonPlan) => void
}

export default function LessonPlanTable({
  data,
  loading,
  loadingMessage = 'Loading lesson plans...',
  emptyMessage = 'No lesson plans yet.',
  readOnly = false,
  canManage = false,
  canApprove = false,
  submitPending = false,
  onTitleClick,
  onEditDraft,
  onSubmit,
  onOpenReview,
}: LessonPlanTableProps) {
  return (
    <Table<LessonPlan>
      loading={loading}
      loadingMessage={loadingMessage}
      emptyMessage={emptyMessage}
      wrapperClassName={tableShell}
      columns={[
        {
          header: 'Title',
          render: (row) => (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onTitleClick(row)}
                className="text-left font-medium text-indigo-700 hover:text-indigo-950"
              >
                {row.title}
              </button>
              {readOnly ? null : (
                <span className="flex items-center gap-0.5">
                  {canManage && row.status === 'draft' ? (
                    <>
                      <button
                        type="button"
                        title="Edit draft"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditDraft?.(row)
                        }}
                        className="rounded-lg p-1 text-indigo-400 transition hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Submit for approval"
                        disabled={submitPending}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSubmit?.(row)
                        }}
                        className="rounded-lg p-1 text-indigo-400 transition hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                  {canApprove && (row.status === 'submitted' || row.status === 'coordinator_approved') ? (
                    <button
                      type="button"
                      title="Review"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenReview?.(row)
                      }}
                      className="rounded-lg p-1 text-indigo-400 transition hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                    </button>
                  ) : null}
                </span>
              )}
            </div>
          ),
        },
        { header: 'Teacher', accessor: 'teacher_name' as keyof LessonPlan },
        {
          header: 'Week',
          render: (row) =>
            row.week_start ? (
              <span className="text-indigo-900/85">
                {formatDate(row.week_start)}
                {row.week_end ? ` – ${formatDate(row.week_end)}` : ''}
              </span>
            ) : (
              <span className="text-indigo-700/55">—</span>
            ),
        },
        {
          header: 'Status',
          render: (row) => {
            const { label } = lessonPlanStatusProgress(row.status)
            return (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${lessonPlanStatusBadgeClass(row.status)}`}
              >
                {label}
              </span>
            )
          },
        },
        {
          header: 'Progress',
          render: (row) => {
            const { pct, label } = lessonPlanStatusProgress(row.status)
            return (
              <div className="min-w-0 space-y-1 sm:min-w-[120px]">
                <div className="text-xs text-indigo-800/80">{label}</div>
                <ProgressBar pct={pct} />
              </div>
            )
          },
        },
      ]}
      data={data}
    />
  )
}
