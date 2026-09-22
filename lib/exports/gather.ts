import { Campus } from "@/lib/db/models/campus"
import { Course } from "@/lib/db/models/course"
import { CreditLedger } from "@/lib/db/models/credit-ledger"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { ProgramEvaluation } from "@/lib/db/models/program-evaluation"
import { Programme } from "@/lib/db/models/programme"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { YearEvaluation } from "@/lib/db/models/year-evaluation"
import { connectMongo } from "@/lib/db/mongo"
import { readArchivalSentence } from "@/lib/catalog/settings"
import { UNIVERSITY_NAME } from "@/lib/domain/booklet"
import { DECLARATION_TEXT } from "@/lib/domain/declaration"
import { recordTypeLabel } from "@/lib/domain/record-types"
import { CREDIT_SOURCE, YEAR_CRITERIA, rubricTotal } from "@/lib/domain/tiers"
import type { BookletPdfInput, WorkshopPdfInput } from "@/lib/exports/pdf"
import type { RubricScore } from "@/lib/db/models/year-evaluation"

function day(value: Date | string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function excerptBody(entry: {
  topic?: string
  title?: string
  taskTitle?: string
  reflection?: string
  result?: string
  recordNotes?: string
  booksManuals?: string
}) {
  const text =
    entry.reflection ||
    entry.result ||
    entry.recordNotes ||
    entry.booksManuals ||
    entry.topic ||
    entry.title ||
    entry.taskTitle ||
    ""
  return text.slice(0, 420)
}

function rubricLines(scores: RubricScore[]) {
  const total = rubricTotal(scores)
  const lines = YEAR_CRITERIA.map((criterion) => {
    const row = scores.find((score) => score.criterionId === criterion.id)
    return `${criterion.label}: ${row ? row.marks : "—"} / ${criterion.max}`
  })
  lines.push(`Total: ${total ?? "—"} / 100`)
  return lines
}

export async function gatherBooklet(input: {
  studentId: string
  scope: "YEAR" | "PROGRAM"
  academicYear?: string
}): Promise<BookletPdfInput> {
  await connectMongo()
  const student = await User.findById(input.studentId).lean()
  if (!student) throw new Error("Student was not found.")
  const [campus, programme, terms, courses] = await Promise.all([
    Campus.findById(student.campusId).lean(),
    student.programmeId ? Programme.findById(student.programmeId).lean() : null,
    Term.find().lean(),
    Course.find({ campusId: student.campusId }).select("_id code title termId").lean(),
  ])
  const termById = new Map(terms.map((term) => [String(term._id), term]))
  const courseById = new Map(courses.map((course) => [String(course._id), course]))
  const yearLabel =
    input.scope === "PROGRAM"
      ? "Full programme"
      : (input.academicYear ?? "Academic year")

  const inScope = (courseId: unknown) => {
    if (input.scope === "PROGRAM") return true
    const course = courseById.get(String(courseId))
    const term = course ? termById.get(String(course.termId)) : undefined
    return term?.academicYear === input.academicYear
  }

  const [entries, deliverables, years, program, ledger] = await Promise.all([
    LrEntry.find({ studentId: student._id, status: "SUBMITTED" }).lean(),
    MajorDeliverable.find({ candidateIds: student._id }).lean(),
    YearEvaluation.find({ studentId: student._id }).sort({ academicYear: 1 }).lean(),
    ProgramEvaluation.findOne({ studentId: student._id }).lean(),
    CreditLedger.find({ studentId: student._id, source: CREDIT_SOURCE })
      .sort({ academicYear: 1 })
      .lean(),
  ])

  const scopedEntries = entries.filter((entry) => inScope(entry.courseId))
  const scopedDeliverables = deliverables.filter((item) => inScope(item.courseId))
  const scopedYears =
    input.scope === "PROGRAM"
      ? years
      : years.filter((year) => year.academicYear === input.academicYear)
  const scopedCredits =
    input.scope === "PROGRAM"
      ? ledger
      : ledger.filter((row) => row.academicYear === input.academicYear)

  const index = [
    ...scopedEntries.map((entry) => {
      const course = courseById.get(String(entry.courseId))
      const books = entry.booksManuals?.trim() || "None"
      return `${recordTypeLabel(entry.recordType)} · ${course?.code ?? "Course"} · ${entry.title || entry.topic || entry.taskTitle || "Untitled"} · Books/Manuals: ${books}`
    }),
    ...scopedDeliverables.map((item) => {
      const course = courseById.get(String(item.courseId))
      return `${item.type.replaceAll("_", " ")} · ${course?.code ?? "Course"} · ${item.title || "Untitled"}`
    }),
  ]

  const excerpts = scopedEntries.slice(0, 12).map((entry) => {
    const course = courseById.get(String(entry.courseId))
    return {
      heading: `${recordTypeLabel(entry.recordType)} · ${course?.code ?? "Course"}`,
      body: `${excerptBody(entry)}\nBooks/Manuals: ${entry.booksManuals?.trim() || "None"}`,
    }
  })

  const rubric = scopedYears.map((year) => ({
    heading: `Year ${year.academicYear}`,
    lines: rubricLines(year.rubricScores as RubricScore[]),
  }))
  if (input.scope === "PROGRAM" && program) {
    rubric.push({
      heading: "Programme evaluation",
      lines: [
        ...rubricLines(program.rubricScores as RubricScore[]),
        `Cumulated mark: ${program.cumulatedMark ?? "—"}`,
        `Final mark: ${program.finalMark ?? "—"}`,
      ],
    })
  }

  const posted = scopedCredits.reduce((sum, row) => sum + row.credits, 0)
  const expected = programme?.durationYears ?? scopedCredits.length
  const creditLine =
    input.scope === "PROGRAM"
      ? `Compulsory Basket: ${posted} / ${expected} ALR credits (1 per signed academic year).`
      : `Compulsory Basket: ${posted} credit for ${yearLabel}.`

  return {
    university: UNIVERSITY_NAME,
    campusName: campus?.name ?? "Campus",
    studentName: student.name,
    registrationNo: student.registrationNo ?? "",
    email: student.email,
    programmeName: programme?.name ?? "Programme",
    academicYearLabel: yearLabel,
    declarationText: DECLARATION_TEXT,
    declarationAcceptedAt: student.declarationAcceptedAt
      ? day(student.declarationAcceptedAt)
      : null,
    index,
    excerpts,
    rubric,
    creditLine,
    archivalSentence: await readArchivalSentence(),
  }
}

export async function gatherWorkshop(input: {
  studentId: string
  courseId: string
}): Promise<WorkshopPdfInput> {
  await connectMongo()
  const [student, course] = await Promise.all([
    User.findById(input.studentId).lean(),
    Course.findById(input.courseId).lean(),
  ])
  if (!student || !course) throw new Error("Student or course was not found.")
  const entries = await LrEntry.find({
    studentId: student._id,
    courseId: course._id,
    recordType: "ACTION_LEARNING",
    status: "SUBMITTED",
  }).lean()
  const dates = entries
    .map((entry) => entry.sessionDate ?? entry.submittedAt ?? entry.createdAt)
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => a.getTime() - b.getTime())
  const totalHours = entries.reduce(
    (sum, entry) => sum + (Number(entry.hoursContributed) || 0),
    0
  )
  return {
    university: UNIVERSITY_NAME,
    studentName: student.name,
    courseCode: course.code,
    courseTitle: course.title,
    totalHours: Math.round(totalHours * 100) / 100,
    from: day(dates[0]) || "—",
    to: day(dates.at(-1)) || "—",
  }
}
