export function normalizeContribution({
  scores,
  entryMax,
  frameworkMarks,
}: {
  scores: number[]
  entryMax: number
  frameworkMarks: number
}): number {
  if (entryMax <= 0) {
    throw new Error("entryMax must be positive")
  }
  if (frameworkMarks < 0) {
    throw new Error("frameworkMarks must be zero or positive")
  }
  if (scores.length === 0) {
    return 0
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
  return (average / entryMax) * frameworkMarks
}
