/**
 * Program-wise cumulation.
 *
 * Default: equal-weight mean of year-wise five-criterion totals (each 0–100).
 * Dean setting `programCumulateScale` (default 100) scales that mean:
 *
 *   cumulated = (sum(yearTotals) / yearTotals.length) * (scale / 100)
 *
 * Scale 100 leaves the mean unchanged.
 * Example: year totals 80 and 90 at scale 100 → 85.
 * Example: the same years at scale 50 → 42.5.
 */
export const CUMULATE_FORMULA =
  "Equal-weight mean of year rubric totals, multiplied by the Dean scale ÷ 100."

export function cumulateYearMarks(yearTotals: number[], scale = 100): number {
  if (yearTotals.length === 0) return 0
  if (!yearTotals.every((value) => Number.isFinite(value))) {
    throw new Error("Year totals must be numbers.")
  }
  const mean =
    yearTotals.reduce((sum, value) => sum + value, 0) / yearTotals.length
  const scaled = mean * (scale / 100)
  return Math.round(scaled * 100) / 100
}

export function describeCumulation(yearTotals: number[], scale = 100): string {
  if (yearTotals.length === 0) return "No signed year marks to cumulate."
  const mark = cumulateYearMarks(yearTotals, scale)
  const listed = yearTotals.join(" + ")
  return `${CUMULATE_FORMULA} (${listed}) / ${yearTotals.length} × ${scale}/100 = ${mark}.`
}
