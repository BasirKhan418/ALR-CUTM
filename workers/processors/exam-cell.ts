import { Campus } from "@/lib/db/models/campus"
import { CreditLedger } from "@/lib/db/models/credit-ledger"
import { ProgramEvaluation } from "@/lib/db/models/program-evaluation"
import { Programme } from "@/lib/db/models/programme"
import { User } from "@/lib/db/models/user"
import { YearEvaluation } from "@/lib/db/models/year-evaluation"
import { connectMongo } from "@/lib/db/mongo"
import { CUMULATE_FORMULA, describeCumulation } from "@/lib/domain/cumulate"
import {
  buildExamCellProgramExport,
  buildExamCellYearExport,
  type ExamCellJobData,
  type ExamCellYearRow,
} from "@/lib/domain/exam-cell"
import { YEAR_CRITERIA, rubricTotal, yearIsClosed } from "@/lib/domain/tiers"
import {
  programExportRelative,
  writeExportFile,
  yearExportRelative,
} from "@/lib/tiers/files"

function studentPayload(user: {
  _id: unknown
  name: string
  email: string
  registrationNo?: string
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    registrationNo: user.registrationNo ?? "",
  }
}

export async function processExamCellExport(data: ExamCellJobData) {
  await connectMongo()
  if (data.programEvaluationId) {
    return exportProgram(data.programEvaluationId)
  }
  return exportYear(data)
}

async function exportYear(data: ExamCellJobData) {
  const target = data.yearEvaluationId
    ? await YearEvaluation.findById(data.yearEvaluationId)
    : null
  const academicYear = target?.academicYear ?? data.academicYear
  const campusId = target ? String(target.campusId) : data.campusId
  if (!academicYear) throw new Error("Academic year is required.")
  if (target && (!target.creditPosted || !yearIsClosed(target.status))) {
    throw new Error("Exam-cell export needs a signed year with a posted credit.")
  }

  const years = await YearEvaluation.find({
    campusId,
    academicYear,
    creditPosted: true,
    status: { $in: ["SIGNED", "EXPORTED"] },
  }).lean()
  if (years.length === 0) {
    throw new Error("No signed year with a posted credit is ready to export.")
  }

  const campus = await Campus.findById(campusId).lean()
  const students = await User.find({
    _id: { $in: years.map((year) => year.studentId) },
  }).lean()
  const studentById = new Map(students.map((student) => [String(student._id), student]))
  const ledger = await CreditLedger.find({
    studentId: { $in: years.map((year) => year.studentId) },
    academicYear,
    source: "ALR_YEAR",
  }).lean()
  const creditByStudent = new Map(ledger.map((row) => [String(row.studentId), row.credits]))

  const rows: ExamCellYearRow[] = years.flatMap((year) => {
    const student = studentById.get(String(year.studentId))
    if (!student) return []
    const total = rubricTotal(year.rubricScores)
    return [
      {
        student: studentPayload(student),
        year: year.academicYear,
        marks: {
          total,
          criteria: YEAR_CRITERIA.map((criterion) => {
            const score = year.rubricScores.find(
              (item: { criterionId: string; marks: number }) => item.criterionId === criterion.id
            )
            return {
              id: criterion.id,
              label: criterion.label,
              marks: score?.marks ?? 0,
              max: criterion.max,
            }
          }),
        },
        credits: creditByStudent.get(String(year.studentId)) ?? 0,
        campus: campus?.name ?? "Campus",
      },
    ]
  })

  const body = buildExamCellYearExport({
    campusId,
    campusName: campus?.name ?? "Campus",
    academicYear,
    rows,
  })
  const relative = yearExportRelative(campusId, academicYear)
  await writeExportFile(relative, body)
  await YearEvaluation.updateMany(
    { _id: { $in: years.map((year) => year._id) } },
    {
      $set: {
        status: "EXPORTED",
        "examCellExport.at": new Date(),
        "examCellExport.payloadRef": relative,
        "examCellExport.status": "READY",
      },
    }
  )
  return { relative, rows: rows.length }
}

async function exportProgram(programEvaluationId: string) {
  const program = await ProgramEvaluation.findById(programEvaluationId)
  if (!program) throw new Error("Program evaluation was not found.")
  if (!yearIsClosed(program.status)) {
    throw new Error("Sign the programme before the exam-cell export.")
  }
  const [student, campus, programme, years, ledger] = await Promise.all([
    User.findById(program.studentId).lean(),
    Campus.findById(program.campusId).lean(),
    Programme.findById(program.programmeId).lean(),
    YearEvaluation.find({ _id: { $in: program.yearEvaluationIds } })
      .sort({ academicYear: 1 })
      .lean(),
    CreditLedger.find({ studentId: program.studentId, source: "ALR_YEAR" }).lean(),
  ])
  if (!student || !campus || !programme) {
    throw new Error("Program export is missing the student, campus, or programme.")
  }
  const scale = program.scaleUsed ?? 100
  const totals = years.map((year) => rubricTotal(year.rubricScores) ?? 0)
  const credits = ledger.reduce((sum, row) => sum + row.credits, 0)
  const body = buildExamCellProgramExport({
    campus: { id: String(campus._id), name: campus.name },
    student: studentPayload(student),
    programme: { name: programme.name, durationYears: programme.durationYears },
    years: years.map((year) => ({
      year: year.academicYear,
      marks: rubricTotal(year.rubricScores),
      credits: ledger.some(
        (row) => row.academicYear === year.academicYear && String(row.studentId) === String(year.studentId)
      )
        ? 1
        : 0,
    })),
    cumulatedMark: program.cumulatedMark ?? null,
    finalMark: program.finalMark ?? null,
    formula: program.cumulatedMark != null
      ? describeCumulation(totals, scale)
      : CUMULATE_FORMULA,
    credits,
    scale,
  })
  const relative = programExportRelative(String(campus._id), String(student._id))
  await writeExportFile(relative, body)
  program.status = "EXPORTED"
  program.examCellExport = {
    at: new Date(),
    payloadRef: relative,
    status: "READY",
  }
  await program.save()
  return { relative }
}
