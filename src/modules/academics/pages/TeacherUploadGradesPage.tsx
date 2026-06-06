import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft, Upload, FileSpreadsheet, Keyboard } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import { Button } from '../../../components/ui/Button'
import { Card, CardBody } from '../../../components/ui/Card'
import { useAcademicFilter } from '../context/AcademicFilterContext'
import { academicFilterSearch } from '../utils/academicFilterQuery'
import { cn } from '../../../utils/cn'

const fieldCls = cn(
  'w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition',
  'border-gray-300 text-gray-900 hover:border-blue-300',
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/35',
)

interface AssessmentTypeRow {
  id: number
  name: string
  term: string
  scoring_mode: string
  max_score: string
}

interface StudentRow {
  id: number
  first_name: string
  last_name: string
  student_id: string | null
}

interface ManualRow {
  score: string
  functional_rating: string
}

const FUNCTIONAL_OPTIONS = [
  { value: '', label: '—' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'needs_improvement', label: 'Needs improvement' },
]

export default function TeacherUploadGradesPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const { classId, subjectId, grade } = useAcademicFilter()
  const ready = Boolean(classId && subjectId)
  const filterQs = academicFilterSearch(grade, classId, subjectId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importCsv, setImportCsv] = useState('')
  const [bulkAssessmentId, setBulkAssessmentId] = useState('')
  const [manualScores, setManualScores] = useState<Record<number, ManualRow>>({})

  useEffect(() => {
    const a = searchParams.get('assessment')
    if (a) setBulkAssessmentId(a)
  }, [searchParams])

  useEffect(() => {
    setManualScores({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [bulkAssessmentId, classId, subjectId])

  const { data: typesList, isFetching: typesLoading } = useQuery({
    queryKey: ['assessment-types', 'teacher-upload'],
    queryFn: () =>
      api.get('/assessment-types/', { params: { page_size: 200, is_active: true } }).then(r => {
        const raw = r.data.results ?? r.data
        return Array.isArray(raw) ? raw : []
      }),
    enabled: ready,
  })
  const typeRows = (typesList as AssessmentTypeRow[] | undefined) ?? []
  const selectedType = typeRows.find(t => String(t.id) === bulkAssessmentId)
  const isFunctional = selectedType?.scoring_mode === 'functional'

  const assessmentSelected = ready && Boolean(bulkAssessmentId)

  const { data: studentsList, isFetching: studentsLoading } = useQuery({
    queryKey: ['students', 'teacher-upload', classId],
    queryFn: () =>
      api
        .get('/students/', { params: { assigned_class: classId, page_size: 500, is_active: true } })
        .then(r => {
          const raw = r.data.results ?? r.data
          return Array.isArray(raw) ? (raw as StudentRow[]) : []
        }),
    enabled: assessmentSelected,
  })
  const students = (studentsList as StudentRow[] | undefined) ?? []

  const setManualCell = (studentId: number, patch: Partial<ManualRow>) => {
    setManualScores(prev => ({
      ...prev,
      [studentId]: {
        score: prev[studentId]?.score ?? '',
        functional_rating: prev[studentId]?.functional_rating ?? '',
        ...patch,
      },
    }))
  }

  const bulkImport = useMutation({
    mutationFn: (payload: { csv?: string; file?: File }) => {
      if (payload.file) {
        const fd = new FormData()
        fd.append('file', payload.file)
        fd.append('assigned_class', String(classId))
        fd.append('subject', String(subjectId))
        fd.append('assessment_type', bulkAssessmentId)
        return api.post('/score-sheets/bulk-import-csv/', fd)
      }
      return api.post('/score-sheets/bulk-import-csv/', {
        assigned_class: Number(classId),
        subject: Number(subjectId),
        assessment_type: Number(bulkAssessmentId),
        csv: payload.csv ?? '',
      })
    },
    onSuccess: () => {
      toast.success('Grades saved to draft score sheet. Submit from the class grades view when ready.')
      qc.invalidateQueries({ queryKey: ['score-sheets'] })
      qc.invalidateQueries({ queryKey: ['score-matrix', classId, subjectId] })
      setImportCsv('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      setManualScores({})
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? 'Import failed — check file format and class/subject.')
    },
  })

  const saveManual = useMutation({
    mutationFn: (scores: { student: number; score?: string; functional_rating?: string; notes: string }[]) =>
      api.post('/score-sheets/save/', {
        assigned_class: Number(classId),
        subject: Number(subjectId),
        assessment_type: Number(bulkAssessmentId),
        scores,
      }),
    onSuccess: () => {
      toast.success('Grades saved to draft.')
      qc.invalidateQueries({ queryKey: ['score-sheets'] })
      qc.invalidateQueries({ queryKey: ['score-matrix', classId, subjectId] })
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error(err.response?.data?.detail ?? 'Save failed.')
    },
  })

  const buildManualPayload = () => {
    const scores: { student: number; score?: string; functional_rating?: string; notes: string }[] = []
    for (const s of students) {
      const m = manualScores[s.id]
      if (!m) continue
      if (isFunctional) {
        if (!m.functional_rating) continue
        scores.push({ student: s.id, functional_rating: m.functional_rating, notes: '' })
      } else if (m.score.trim()) {
        scores.push({ student: s.id, score: m.score.trim(), notes: '' })
      }
    }
    return scores
  }

  const onSaveManual = () => {
    const scores = buildManualPayload()
    if (scores.length === 0) {
      toast.error('Enter at least one score before saving.')
      return
    }
    saveManual.mutate(scores)
  }

  const messageFromBlob = async (data: unknown): Promise<string | null> => {
    if (!(data instanceof Blob)) return null
    try {
      const text = await data.text()
      const j = JSON.parse(text) as { detail?: unknown }
      if (typeof j.detail === 'string') return j.detail
      return null
    } catch {
      return null
    }
  }

  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    if (!classId || !subjectId || !bulkAssessmentId) {
      toast.error('Select class, subject, and assessment')
      return
    }
    try {
      const res = await api.get('/score-sheets/bulk-template/', {
        params: {
          assigned_class: classId,
          subject: subjectId,
          assessment_type: bulkAssessmentId,
          ...(format === 'xlsx' ? { format: 'xlsx' } : {}),
        },
        responseType: 'blob',
      })
      const ct = (res.headers['content-type'] ?? '').toLowerCase()
      if (ct.includes('application/json')) {
        const msg = await messageFromBlob(res.data)
        toast.error(msg ?? 'Download failed')
        return
      }
      const mime =
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv;charset=utf-8'
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'xlsx' ? 'grade_import_template.xlsx' : 'grade_import_template.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const msg = await messageFromBlob(err.response.data)
        toast.error(msg ?? err.message ?? 'Download failed')
        return
      }
      toast.error('Download failed — check your connection and try again.')
    }
  }

  const onPickFile = () => fileInputRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !bulkAssessmentId) return
    bulkImport.mutate({ file })
  }

  return (
    <div className="space-y-5">
      <Link
        to="/dashboard/teacher"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded-md"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to teacher dashboard
      </Link>

      {!ready && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200/60">
          Choose a <strong>grade level</strong>, then <strong>class</strong> and <strong>subject</strong> in the filter bar
          above to enable upload.
        </div>
      )}

      {ready && (
        <div className="rounded-xl border border-blue-100/80 bg-gradient-to-br from-white to-blue-50/40 p-4 shadow-sm ring-1 ring-blue-100/60">
          <div className="mb-4 flex items-center gap-2 text-blue-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-blue-950">Upload grades</h2>
              <p className="text-xs text-blue-900/70">
                Download a template, enter grades in the list or in Excel, then import the file — all save to your draft
                sheet.
              </p>
            </div>
          </div>

          <Card className="border-blue-100/80 bg-white/90 shadow-sm">
            <CardBody className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-900/80">
                  Assessment
                </label>
                <select
                  value={bulkAssessmentId}
                  onChange={e => setBulkAssessmentId(e.target.value)}
                  disabled={typesLoading}
                  className={fieldCls}
    >
                  <option value="">{typesLoading ? 'Loading assessments…' : '— Select assessment —'}</option>
                  {typeRows.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.term})
                    </option>
                  ))}
                </select>
                {ready && !typesLoading && typeRows.length === 0 ? (
                  <p className="mt-1.5 text-xs text-amber-700">No active assessment types found. Contact your administrator.</p>
                ) : null}
              </div>

              {assessmentSelected && selectedType && (
                <>
                  <div className="flex flex-wrap items-center gap-2 border-t border-blue-100/80 pt-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-900/80">Templates</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="border-blue-200 text-blue-800 hover:bg-blue-50"
                      onClick={() => downloadTemplate('xlsx')}
                    >
                      <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                      Excel template
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="border-blue-200 text-blue-800 hover:bg-blue-50"
                      onClick={() => downloadTemplate('csv')}
                    >
                      CSV template
                    </Button>
                    <span className="text-[11px] text-gray-500">
                      {isFunctional
                        ? 'Functional ratings: excellent, good, needs improvement.'
                        : `Numeric scores (max ${selectedType.max_score}).`}
                    </span>
                  </div>

                  <div className="rounded-lg border border-blue-100/90 bg-blue-50/30 p-3">
                    <div className="mb-2 flex items-center gap-2 text-blue-950">
                      <Keyboard className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold">Enter grades manually</span>
                    </div>
                    {studentsLoading ? (
                      <p className="text-sm text-gray-500">Loading students…</p>
                    ) : students.length === 0 ? (
                      <p className="text-sm text-amber-800">No active students in this class.</p>
                    ) : (
                      <div className="max-h-[min(420px,50vh)] overflow-auto rounded-lg border border-gray-200 bg-white">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Student
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Code
                              </th>
                              <th className="w-40 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {isFunctional ? 'Rating' : 'Score'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {students.map(s => (
                              <tr key={s.id} className="bg-white hover:bg-blue-50/40">
                                <td className="px-3 py-2 text-gray-900">
                                  {s.first_name} {s.last_name}
                                </td>
                                <td className="px-3 py-2 text-gray-600">{s.student_id ?? '—'}</td>
                                <td className="px-3 py-2">
                                  {isFunctional ? (
                                    <select
                                      value={manualScores[s.id]?.functional_rating ?? ''}
                                      onChange={e =>
                                        setManualCell(s.id, { functional_rating: e.target.value })
                                      }
                                      className={cn(fieldCls, 'py-1.5')}
                                    >
                                      {FUNCTIONAL_OPTIONS.map(o => (
                                        <option key={o.value || 'empty'} value={o.value}>
                                          {o.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={manualScores[s.id]?.score ?? ''}
                                      onChange={e => setManualCell(s.id, { score: e.target.value })}
                                      placeholder={`0 – ${selectedType.max_score}`}
                                      className={cn(fieldCls, 'py-1.5')}
                                    />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        className="shadow-sm"
                        loading={saveManual.isPending}
                        disabled={students.length === 0}
                        onClick={onSaveManual}
                      >
                        Save manual entries to draft
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-blue-100/80 pt-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-blue-900/80">
                      Import filled template
                    </label>
                    <p className="text-xs text-gray-600">
                      Upload the same Excel or CSV template after you fill in the last column. Rows with empty scores are
                      skipped.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xlsm,.csv,text/csv"
                      className="hidden"
                      onChange={onFileChange}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="border-blue-200 text-blue-800 hover:bg-blue-50"
                        loading={bulkImport.isPending}
                        onClick={onPickFile}
                      >
                        Choose file (.xlsx / .csv)
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-blue-900/80">
                      Or paste CSV
                    </label>
                    <textarea
                      value={importCsv}
                      onChange={e => setImportCsv(e.target.value)}
                      rows={6}
                      placeholder="Paste CSV (header + rows from template)…"
                      className={cn(fieldCls, 'font-mono text-xs')}
                    />
                    <div className="mt-2">
                      <Button
                        size="sm"
                        className="shadow-sm"
                        loading={bulkImport.isPending}
                        disabled={!importCsv.trim()}
                        onClick={() => bulkImport.mutate({ csv: importCsv })}
                      >
                        Import pasted CSV to draft
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {filterQs ? (
                <p className="text-[11px] text-gray-500">
                  Filters are saved in the URL — you can bookmark this page with the same class and subject.
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
