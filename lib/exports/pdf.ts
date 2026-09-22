import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { BOOKLET_SECTIONS } from "@/lib/domain/booklet"

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 56
const INK = rgb(0.12, 0.14, 0.12)

export type BookletPdfInput = {
  university: string
  campusName: string
  studentName: string
  registrationNo: string
  email: string
  programmeName: string
  academicYearLabel: string
  declarationText: string
  declarationAcceptedAt: string | null
  index: string[]
  excerpts: { heading: string; body: string }[]
  rubric: { heading: string; lines: string[] }[]
  creditLine: string
  archivalSentence: string
}

export type WorkshopPdfInput = {
  university: string
  studentName: string
  courseCode: string
  courseTitle: string
  totalHours: number
  from: string
  to: string
}

type Pen = {
  doc: PDFDocument
  font: PDFFont
  bold: PDFFont
  page: PDFPage
  y: number
}

function addPage(pen: Pen) {
  pen.page = pen.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  pen.y = PAGE_HEIGHT - MARGIN
}

function ensure(pen: Pen, height: number) {
  if (pen.y - height < MARGIN) addPage(pen)
}

function wrap(font: PDFFont, text: string, size: number) {
  const max = PAGE_WIDTH - MARGIN * 2
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > max && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.length > 0 ? lines : [""]
}

function write(pen: Pen, text: string, size: number, bold = false) {
  const font = bold ? pen.bold : pen.font
  for (const line of wrap(font, text, size)) {
    ensure(pen, size + 5)
    if (line) {
      pen.page.drawText(line, {
        x: MARGIN,
        y: pen.y,
        size,
        font,
        color: INK,
      })
    }
    pen.y -= size + 5
  }
}

function gap(pen: Pen, amount = 10) {
  pen.y -= amount
}

function heading(pen: Pen, title: string) {
  ensure(pen, 36)
  write(pen, title, 16, true)
  gap(pen, 6)
}

async function pen(): Promise<Pen> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.TimesRoman)
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const draft: Pen = {
    doc,
    font,
    bold,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
  }
  return draft
}

export async function renderBooklet(input: BookletPdfInput): Promise<Uint8Array> {
  const pdf = await pen()
  const [cover, certificate, declaration, index, excerpts, rubric, credit] =
    BOOKLET_SECTIONS

  heading(pdf, cover)
  write(pdf, input.university, 12, true)
  write(pdf, input.campusName, 12)
  gap(pdf)
  write(pdf, input.studentName, 14, true)
  write(pdf, input.registrationNo || input.email, 11)
  write(pdf, input.programmeName, 11)
  write(pdf, input.academicYearLabel, 11)
  gap(pdf, 16)

  heading(pdf, certificate)
  write(
    pdf,
    `This certifies that ${input.studentName} completed the Learning Record described in this booklet for ${input.programmeName} at ${input.campusName}.`,
    11
  )
  gap(pdf, 16)

  heading(pdf, declaration)
  write(pdf, input.declarationText, 10)
  gap(pdf, 6)
  write(
    pdf,
    input.declarationAcceptedAt
      ? `Accepted ${input.declarationAcceptedAt}.`
      : "Declaration has not been accepted.",
    11,
    true
  )
  gap(pdf, 16)

  heading(pdf, index)
  const lines = input.index.length > 0 ? input.index : ["No components are on record."]
  for (const line of lines) write(pdf, line, 11)
  gap(pdf, 16)

  heading(pdf, excerpts)
  const bodies =
    input.excerpts.length > 0
      ? input.excerpts
      : [{ heading: "Records", body: "No submitted excerpts are on record." }]
  for (const item of bodies) {
    write(pdf, item.heading, 12, true)
    write(pdf, item.body || "No excerpt.", 10)
    gap(pdf, 8)
  }
  gap(pdf, 8)

  heading(pdf, rubric)
  if (input.rubric.length === 0) {
    write(pdf, "No year or programme rubric is scored.", 11)
  }
  for (const block of input.rubric) {
    write(pdf, block.heading, 12, true)
    for (const line of block.lines) write(pdf, line, 11)
    gap(pdf, 8)
  }
  gap(pdf, 8)

  heading(pdf, credit)
  write(pdf, input.creditLine, 12, true)
  gap(pdf, 16)
  write(pdf, input.archivalSentence, 10)

  return pdf.doc.save()
}

export async function renderWorkshopCertificate(
  input: WorkshopPdfInput
): Promise<Uint8Array> {
  const pdf = await pen()
  heading(pdf, "Workshop hours certificate")
  write(pdf, input.university, 12, true)
  gap(pdf)
  write(pdf, input.studentName, 14, true)
  write(pdf, `${input.courseCode} · ${input.courseTitle}`, 12)
  gap(pdf)
  write(pdf, `Total hours: ${input.totalHours}`, 12, true)
  write(pdf, `Date range: ${input.from} to ${input.to}`, 11)
  return pdf.doc.save()
}
