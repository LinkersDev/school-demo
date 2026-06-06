import { jsPDF } from 'jspdf'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import { SCHOOL_NAME_EXPORT } from '../constants/school'

export interface HomeworkExportSource {
  title: string
  description: string
  due_date: string
  className: string
  subjectName: string
  status?: string
  submission_count?: number
  progress_percent?: number
}

function safeFilenamePart(title: string): string {
  return title
    .trim()
    .replace(/[^\w\u0600-\u06FF\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60) || 'homework'
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadHomeworkPdf(hw: HomeworkExportSource) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 48
  let y = 52

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(SCHOOL_NAME_EXPORT, pageW / 2, y, { align: 'center' })
  y += 32

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Title: ${hw.title}`, margin, y)
  y += 18
  doc.text(`Class: ${hw.className}   |   Subject: ${hw.subjectName}`, margin, y)
  y += 18
  doc.text(`Due: ${hw.due_date}`, margin, y)
  y += 18
  if (hw.status) {
    doc.text(`Status: ${hw.status}`, margin, y)
    y += 18
  }
  if (typeof hw.submission_count === 'number') {
    doc.text(`Submissions: ${hw.submission_count}`, margin, y)
    y += 18
  }
  if (typeof hw.progress_percent === 'number' && hw.submission_count && hw.submission_count > 0) {
    doc.text(`Average progress: ${Math.round(hw.progress_percent)}%`, margin, y)
    y += 18
  }

  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Instructions', margin, y)
  y += 16
  doc.setFont('helvetica', 'normal')
  const body = hw.description || '—'
  const lines = doc.splitTextToSize(body, pageW - margin * 2)
  const lineH = 13
  const pageH = doc.internal.pageSize.getHeight()
  for (let i = 0; i < lines.length; i++) {
    if (y > pageH - margin) {
      doc.addPage()
      y = margin
    }
    doc.text(lines[i], margin, y)
    y += lineH
  }

  doc.save(`${safeFilenamePart(hw.title)}.pdf`)
}

export async function downloadHomeworkDocx(hw: HomeworkExportSource) {
  const metaLines: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: 'Title: ', bold: true }),
        new TextRun(hw.title),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Class: ', bold: true }),
        new TextRun(hw.className),
        new TextRun({ text: '     Subject: ', bold: true }),
        new TextRun(hw.subjectName),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Due: ', bold: true }),
        new TextRun(hw.due_date),
      ],
    }),
  ]
  if (hw.status) {
    metaLines.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Status: ', bold: true }),
          new TextRun(hw.status),
        ],
      }),
    )
  }
  if (typeof hw.submission_count === 'number') {
    metaLines.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Submissions: ', bold: true }),
          new TextRun(String(hw.submission_count)),
        ],
      }),
    )
  }
  if (typeof hw.progress_percent === 'number' && hw.submission_count && hw.submission_count > 0) {
    metaLines.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Average progress: ', bold: true }),
          new TextRun(`${Math.round(hw.progress_percent)}%`),
        ],
      }),
    )
  }

  const descParas =
    (hw.description || '—').split('\n').map(
      (line) => new Paragraph({ children: [new TextRun(line || ' ')] }),
    ) ?? []

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: SCHOOL_NAME_EXPORT,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          ...metaLines,
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: 'Instructions', bold: true })],
          }),
          ...descParas,
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, `${safeFilenamePart(hw.title)}.docx`)
}
