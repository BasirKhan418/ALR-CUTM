export type ExamCellJobData = {
  campusId: string
  academicYear?: string
  yearEvaluationId?: string
  programEvaluationId?: string
}

export type ExamCellCriterion = {
  id: string
  label: string
  marks: number
  max: number
}

export type ExamCellYearRow = {
  student: {
    id: string
    name: string
    email: string
    registrationNo: string
  }
  year: string
  marks: {
    total: number | null
    criteria: ExamCellCriterion[]
  }
  credits: number
  campus: string
}

export type ExamCellYearExport = {
  kind: "exam-cell"
  campus: { id: string; name: string }
  academicYear: string
  exportedAt: string
  rows: ExamCellYearRow[]
}

export type ExamCellProgramExport = {
  kind: "exam-cell-program"
  campus: { id: string; name: string }
  student: ExamCellYearRow["student"]
  programme: { name: string; durationYears: number }
  years: { year: string; marks: number | null; credits: number }[]
  cumulatedMark: number | null
  finalMark: number | null
  formula: string
  credits: number
  scale: number
  exportedAt: string
}

export function buildExamCellYearExport(input: {
  campusId: string
  campusName: string
  academicYear: string
  rows: ExamCellYearRow[]
  exportedAt?: string
}): ExamCellYearExport {
  return {
    kind: "exam-cell",
    campus: { id: input.campusId, name: input.campusName },
    academicYear: input.academicYear,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    rows: input.rows,
  }
}

export function buildExamCellProgramExport(
  input: Omit<ExamCellProgramExport, "kind" | "exportedAt"> & { exportedAt?: string }
): ExamCellProgramExport {
  return {
    kind: "exam-cell-program",
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    campus: input.campus,
    student: input.student,
    programme: input.programme,
    years: input.years,
    cumulatedMark: input.cumulatedMark,
    finalMark: input.finalMark,
    formula: input.formula,
    credits: input.credits,
    scale: input.scale,
  }
}
