import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '../../../utils/format'
import api from '../../../services/api'
import type { ParentHomeworkRow } from '../services/parentPortal.service'
import { validateHomeworkImageFile } from '../../../utils/homeworkUpload'

export default function SubmitHomeworkModal({
  homework,
  studentId,
  onClose,
}: {
  homework: ParentHomeworkRow
  studentId: number
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [notes, setNotes] = useState(homework.submission?.notes ?? '')
  const [photo, setPhoto] = useState<File | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('student_id', String(studentId))
      fd.append('notes', notes)
      if (photo) fd.append('file', photo)
      return api.post(`/homeworks/${homework.id}/parent-submit/`, fd).then((r) => r.data)
    },
    onSuccess: () => {
      toast.success('Homework submitted successfully!')
      qc.invalidateQueries({ queryKey: ['dashboard-parent'] })
      qc.invalidateQueries({ queryKey: ['parent-child-detail', studentId] })
      onClose()
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error(e?.response?.data?.detail ?? 'Submission failed')
    },
  })

  const onSubmit = () => {
    if (photo) {
      const err = validateHomeworkImageFile(photo)
      if (err) {
        toast.error(err)
        return
      }
    }
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Submit homework</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <p className="text-sm font-medium text-gray-800">{homework.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {homework.subject__name} · Due {formatDate(homework.due_date)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Instructions</p>
            <div className="text-sm text-gray-700 border border-gray-100 rounded-xl p-3 max-h-40 overflow-y-auto bg-gray-50 whitespace-pre-wrap">
              {homework.description?.trim() ? homework.description : 'No additional instructions.'}
            </div>
          </div>

          {homework.attachment_url && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Teacher reference</p>
              <a
                href={homework.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Open reference image
              </a>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Your answer / notes</label>
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write the answer or any notes here…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Photo (optional, max 2MB, JPEG/PNG/WebP/GIF)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                if (!f) {
                  setPhoto(null)
                  return
                }
                const err = validateHomeworkImageFile(f)
                if (err) {
                  toast.error(err)
                  e.target.value = ''
                  return
                }
                setPhoto(f)
              }}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {homework.submission?.status === 'graded' && homework.submission.score != null && (
            <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-green-700 space-y-1">
              <p className="font-medium">Already graded</p>
              <p>
                Score: {homework.submission.score} / {homework.max_score}
              </p>
              {homework.submission.feedback && (
                <p className="text-xs text-green-600">{homework.submission.feedback}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5 pt-2 border-t border-gray-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={mutation.isPending || homework.submission?.status === 'graded'}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {mutation.isPending ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
