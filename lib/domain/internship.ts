export const INTERNSHIP_HALF_MAX = 50
export const INTERNSHIP_REPORT_MAX = 30
export const INTERNSHIP_HALF_FRAMEWORK = INTERNSHIP_REPORT_MAX / 2

/**
 * Internal and external each contribute half of the 30-point Internship Report.
 * (score / 50) * 15, then sum. Equivalent to
 * ((internal/50)*50% + (external/50)*50%) * 30.
 */
export function internshipHalfContribution(score: number): number {
  return (score / INTERNSHIP_HALF_MAX) * INTERNSHIP_HALF_FRAMEWORK
}

export function internshipReportTotal(internal: number, external: number): number {
  return internshipHalfContribution(internal) + internshipHalfContribution(external)
}

export function validateInternshipHalf(score: number, label: string): string | null {
  if (!Number.isFinite(score) || score < 0) {
    return `${label} must be a number of 0 or more.`
  }
  if (score > INTERNSHIP_HALF_MAX) {
    return `${label} cannot exceed ${INTERNSHIP_HALF_MAX}.`
  }
  return null
}

export const INTERNSHIP_FORMULA_TEXT =
  "Internal /50 and External /50 each contribute 15 of the 30-point Internship Report. There is no manual final field."
