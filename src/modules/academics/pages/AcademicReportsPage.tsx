import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Card, CardBody } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { useAuth } from '../../../hooks/useAuth'
import api from '../../../services/api'
import { useAcademicFilter } from '../context/AcademicFilterContext'

export default function AcademicReportsPage() {
  const { hasScope, user } = useAuth()
  const qc = useQueryClient()
  const canManage = hasScope('grades.manage')
  const { classId, subjectId } = useAcademicFilter()

  const [importCsv, setImportCsv] = useState('')
  const [assessmentTypeId, setAssessmentTypeId] = useState('')
  const [copySource, setCopySource] = useState('')
  const [copyTarget, setCopyTarget] = useState('')

  const { data: types } = useQuery({
    queryKey: ['assessment-types', 'reports'],
    queryFn: () =>
      api.get('/assessment-types/', { params: { page_size: 200 } }).then(r => r.data.results ?? r.data),
    enabled: canManage,
  })

  const typeList = (types as { id: number; name: string; term: string }[] | undefined) ?? []

  const bulkImport = useMutation({
    mutationFn: () =>
      api.post('/score-sheets/bulk-import-csv/', {
        assigned_class: Number(classId),
        subject: Number(subjectId),
        assessment_type: Number(assessmentTypeId),
        csv: importCsv,
      }),
    onSuccess: () => {
      toast.success('Import saved to draft sheet')
      qc.invalidateQueries({ queryKey: ['score-sheets'] })
      qc.invalidateQueries({ queryKey: ['score-matrix'] })
      setImportCsv('')
    },
    onError: () => toast.error('Import failed — check class, subject, sheet status, and CSV'),
  })

  const copyScores = useMutation({
    mutationFn: () =>
      api.post('/score-sheets/copy-assessment-scores/', {
        assigned_class: Number(classId),
        subject: Number(subjectId),
        source_assessment_type: Number(copySource),
        target_assessment_type: Number(copyTarget),
      }),
    onSuccess: () => {
      toast.success('Scores copied to target draft')
      qc.invalidateQueries({ queryKey: ['score-sheets'] })
      qc.invalidateQueries({ queryKey: ['score-matrix'] })
    },
    onError: () => toast.error('Copy failed — ensure target sheet is draft'),
  })

  const downloadTemplate = async () => {
    if (!classId || !subjectId || !assessmentTypeId) {
      toast.error('Select class, subject, and assessment type (filter + dropdown)')
      return
    }
    try {
      const res = await api.get('/score-sheets/bulk-template/', {
        params: {
          assigned_class: classId,
          subject: subjectId,
          assessment_type: assessmentTypeId,
        },
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'grade_import_template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download template')
    }
  }

  if (!canManage) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-semibold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-600">
            Bulk import and coordinator tools require the grades.manage scope.
          </p>
          {user?.role === 'admin' && (
            <Link to="/grades/explorer" className="text-sm text-blue-600 hover:underline">
              Subject exam matrix (legacy) →
            </Link>
          )}
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">CSV bulk import</h2>
          <p className="text-sm text-gray-500">
            Use the filter bar for <strong>class</strong> and <strong>subject</strong>. Choose an assessment type,
            download the template, fill scores or functional ratings, then paste CSV here.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Assessment type</label>
            <select
              value={assessmentTypeId}
              onChange={e => setAssessmentTypeId(e.target.value)}
              className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select —</option>
              {typeList.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.term})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={downloadTemplate}>
              Download CSV template
            </Button>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">CSV contents</label>
            <textarea
              value={importCsv}
              onChange={e => setImportCsv(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
              placeholder="Paste CSV (header + rows from template)..."
            />
          </div>
          <Button
            size="sm"
            loading={bulkImport.isPending}
            disabled={!classId || !subjectId || !assessmentTypeId || !importCsv.trim()}
            onClick={() => bulkImport.mutate()}
          >
            Upload &amp; save to draft sheet
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Copy scores between assessments</h2>
          <p className="text-sm text-gray-500">
            Copies rows from a source sheet to a target sheet (same class × subject). Target must be editable
            (draft/rejected).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Source assessment</label>
              <select
                value={copySource}
                onChange={e => setCopySource(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">— Select —</option>
                {typeList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Target assessment</label>
              <select
                value={copyTarget}
                onChange={e => setCopyTarget(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">— Select —</option>
                {typeList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={copyScores.isPending}
            disabled={!classId || !subjectId || !copySource || !copyTarget || copySource === copyTarget}
            onClick={() => copyScores.mutate()}
          >
            Copy scores
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Legacy tools</h2>
          <p className="text-sm text-gray-500">
            Subject-exam grading explorer remains available for admins during migration.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/grading-legacy" className="text-sm text-blue-600 hover:underline">
              Legacy exams &amp; score sheets →
            </Link>
            {user?.role === 'admin' ? (
              <Link to="/grades/explorer" className="text-sm text-blue-600 hover:underline">
                Grading explorer →
              </Link>
            ) : null}
          </p>
          {user?.role !== 'admin' ? (
            <p className="text-xs text-gray-400">Admin role required for grading explorer.</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-lg font-semibold text-gray-900">GPA / PDF</h2>
          <p className="text-sm text-gray-500">
            Class GPA from approved numeric sheets and PDF report cards can be added as a follow-up; approved
            structured scores are exposed to the parent portal.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
