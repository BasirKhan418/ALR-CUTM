export function formatMarks(value: number) {
  if (!Number.isFinite(value)) return "—"
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}
