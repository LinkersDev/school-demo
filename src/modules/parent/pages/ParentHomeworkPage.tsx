import { useState } from 'react'
import { BookOpen, CheckCircle2, Clock, Send } from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { formatDate } from '../../../utils/format'
import ChildSelector from '../components/ChildSelector'
import SubmitHomeworkModal from '../components/SubmitHomeworkModal'
import { useParentChildContext } from '../hooks/useParentChildContext'
import type { ParentHomeworkRow } from '../services/parentPortal.service'

export default function ParentHomeworkPage() {
  const { children, activeId, setStudentId, detail, isLoading, hasChildren } = useParentChildContext()
  const [submitting, setSubmitting] = useState<ParentHomeworkRow | null>(null)

  if (isLoading && !detail) {
    return <div className="text-center py-20 text-gray-400">Loading homework…</div>
  }

  if (!hasChildren) {
    return (
      <div className="text-center py-20 text-gray-500">
        No children linked to your account yet.
      </div>
    )
  }

  const list = detail?.homework ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-blue-600" />
          Homework
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Assignments for your child’s class · {detail?.child.name ?? '…'}
        </p>
      </div>

      <ChildSelector children={children} activeId={activeId} onSelect={setStudentId} />

      <Card>
        <CardHeader>
          <h3 className="font-semibold">All assignments</h3>
          <p className="text-xs text-gray-400 font-normal">Submit answers or notes for your teacher to review</p>
        </CardHeader>
        <div className="divide-y divide-gray-50">
          {list.length === 0 ? (
            <CardBody>
              <p className="text-sm text-gray-400">No homework posted for this class yet.</p>
            </CardBody>
          ) : (
            list.map(h => {
              const isGraded = h.submission?.status === 'graded'
              const isSubmitted = h.submitted

              return (
                <div key={h.id} className="px-6 py-4 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900">{h.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {h.subject__name} · Due {formatDate(h.due_date)}
                      </div>
                      {h.description ? (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-3">{h.description}</p>
                      ) : null}
                      {isGraded && h.submission && (
                        <div className="text-xs text-green-600 mt-2 font-medium">
                          Graded: {h.submission.score}/{h.max_score}
                          {h.submission.feedback ? ` — ${h.submission.feedback}` : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {isGraded ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Graded
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium">
                          <Clock className="w-3.5 h-3.5" /> Submitted
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSubmitting(h)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {submitting && activeId != null && (
        <SubmitHomeworkModal
          homework={submitting}
          studentId={activeId}
          onClose={() => setSubmitting(null)}
        />
      )}
    </div>
  )
}
