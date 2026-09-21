export type SimilarityFile = {
  path: string
  mime: string
  text: string
}

export type SimilarityMatch = {
  id: string
  sourceLabel: string
  sourceTargetId?: string
  overlap: number
  excerpt?: string
}

export interface SimilarityProvider {
  kind: "prose" | "code"
  analyze(input: {
    files: SimilarityFile[]
    corpus: { id: string; label: string; text: string }[]
  }): Promise<{ score: number; matches: SimilarityMatch[] }>
}

function shingles(text: string, size: number) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1)
  const set = new Set<string>()
  if (tokens.length === 0) return set
  if (tokens.length <= size) {
    set.add(tokens.join(" "))
    return set
  }
  for (let i = 0; i <= tokens.length - size; i += 1) {
    set.add(tokens.slice(i, i + size).join(" "))
  }
  return set
}

function overlapPercent(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) return 0
  let hit = 0
  for (const item of left) {
    if (right.has(item)) hit += 1
  }
  return Math.round((hit / Math.max(left.size, right.size)) * 1000) / 10
}

export function hashedShingleOverlap(
  source: string,
  corpus: { id: string; label: string; text: string }[],
  size: number
): { score: number; matches: SimilarityMatch[] } {
  const sourceSet = shingles(source, size)
  const matches = corpus
    .map((item) => {
      const overlap = overlapPercent(sourceSet, shingles(item.text, size))
      return {
        id: item.id,
        sourceLabel: item.label,
        sourceTargetId: item.id,
        overlap,
        excerpt: item.text.slice(0, 140),
      }
    })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 8)
  const score = matches[0]?.overlap ?? 0
  return { score, matches }
}

export const stubProseProvider: SimilarityProvider = {
  kind: "prose",
  async analyze(input) {
    return hashedShingleOverlap(
      input.files.map((file) => file.text).join("\n"),
      input.corpus,
      3
    )
  },
}

export const stubCodeProvider: SimilarityProvider = {
  kind: "code",
  async analyze(input) {
    return hashedShingleOverlap(
      input.files.map((file) => file.text).join("\n"),
      input.corpus,
      2
    )
  },
}

export function providerFor(kind: "prose" | "code"): SimilarityProvider {
  return kind === "code" ? stubCodeProvider : stubProseProvider
}
