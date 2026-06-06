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

export interface LessonPlanExportSource {
  title: string
  objectives: string
  activities: string
  materials: string
  className: string
  subjectName: string
  weekRange: string
  status?: string
  statusLabel?: string
}

function safeFilenamePart(title: string): string {
  return (
    title
      .trim()
      .replace(/[^\w\u0600-\u06FF\-]+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 60) || 'lesson-plan'
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function sectionPdf(doc: jsPDF, margin: number, pageW: number, title: string, body: string, y: number): number {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(title, margin, y)
  y += 14
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(body || '—', pageW - margin * 2)
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
  y += 10
  return y
}

export function downloadLessonPlanPdf(lp: LessonPlanExportSource) {
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
  doc.text(`Title: ${lp.title}`, margin, y)
  y += 18
  doc.text(`Class: ${lp.className}   |   Subject: ${lp.subjectName}`, margin, y)
  y += 18
  doc.text(`Week: ${lp.weekRange}`, margin, y)
  y += 18
  const statusText = lp.statusLabel ?? lp.status
  if (statusText) {
    doc.text(`Status: ${statusText}`, margin, y)
    y += 18
  }

  y += 6
  y = sectionPdf(doc, margin, pageW, 'Objectives', lp.objectives, y)
  y = sectionPdf(doc, margin, pageW, 'Activities', lp.activities, y)
  sectionPdf(doc, margin, pageW, 'Materials', lp.materials, y)

  doc.save(`${safeFilenamePart(lp.title)}_lesson-plan.pdf`)
}

function labeledParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun(value || '—'),
    ],
  })
}

function bodyParagraphs(text: string, heading: string): Paragraph[] {
  return [
    new Paragraph({
      children: [new TextRun({ text: heading, bold: true })],
    }),
    ...(text || '—').split('\n').map((line) => new Paragraph({ children: [new TextRun(line || ' ')] })),
    new Paragraph({ text: '' }),
  ]
}

export async function downloadLessonPlanDocx(lp: LessonPlanExportSource) {
  const meta: Paragraph[] = [
    labeledParagraph('Title', lp.title),
    labeledParagraph('Class', lp.className),
    labeledParagraph('Subject', lp.subjectName),
    labeledParagraph('Week', lp.weekRange),
  ]
  const st = lp.statusLabel ?? lp.status
  if (st) meta.push(labeledParagraph('Status', st))

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
          ...meta,
          new Paragraph({ text: '' }),
          ...bodyParagraphs(lp.objectives, 'Objectives'),
          ...bodyParagraphs(lp.activities, 'Activities'),
          ...bodyParagraphs(lp.materials, 'Materials').slice(0, -1),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  triggerDownload(blob, `${safeFilenamePart(lp.title)}_lesson-plan.docx`)
}
