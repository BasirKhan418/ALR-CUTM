import { LrEntry } from "@/lib/db/models/lr-entry"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { ProgrammingUpload } from "@/lib/db/models/programming-upload"
import { StoredFile } from "@/lib/db/models/file"
import { readStoredFile } from "@/lib/files/store"

function readable(bytes: Buffer) {
  return bytes
    .toString("utf8")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function textFromFileId(fileId: string | undefined | null) {
  if (!fileId) return ""
  const file = await StoredFile.findById(fileId).lean()
  if (!file) return ""
  const bytes = await readStoredFile(file.storagePath)
  return readable(bytes)
}

export async function deliverableText(id: string) {
  const row = await MajorDeliverable.findById(id).lean()
  if (!row) return ""
  const parts = await Promise.all([
    textFromFileId(row.wordFileId ? String(row.wordFileId) : null),
    textFromFileId(row.pdfFileId ? String(row.pdfFileId) : null),
    Promise.resolve([row.title, row.specialization].filter(Boolean).join(" ")),
  ])
  return parts.filter(Boolean).join("\n")
}

export async function lrEntryText(id: string) {
  const row = await LrEntry.findById(id).lean()
  if (!row) return ""
  return [
    row.title,
    row.topic,
    row.concept,
    row.planning,
    row.result,
    row.recordNotes,
    row.vivaNotes,
    row.taskTitle,
    row.criticalThinking,
    row.reflection,
    row.booksManuals,
  ]
    .filter(Boolean)
    .join("\n")
}

export async function programmingText(id: string) {
  const row = await ProgrammingUpload.findById(id).lean()
  if (!row) return ""
  return textFromFileId(String(row.zipFileId))
}

export async function proseCorpus(termId: string, skipId: string) {
  const [deliverables, entries] = await Promise.all([
    MajorDeliverable.find({
      termId,
      _id: { $ne: skipId },
      wordFileId: { $exists: true },
    })
      .select("title")
      .lean(),
    LrEntry.find({
      termId,
      _id: { $ne: skipId },
      status: "SUBMITTED",
    })
      .select("title topic taskTitle")
      .lean(),
  ])
  const deliverableTexts = await Promise.all(
    deliverables.map(async (row) => ({
      id: String(row._id),
      label: row.title || "Deliverable",
      text: await deliverableText(String(row._id)),
    }))
  )
  const entryTexts = await Promise.all(
    entries.map(async (row) => ({
      id: String(row._id),
      label: row.title || row.topic || row.taskTitle || "Learning Record",
      text: await lrEntryText(String(row._id)),
    }))
  )
  return [...deliverableTexts, ...entryTexts].filter((item) => item.text.length > 20)
}

export async function codeCorpus(termId: string, skipId: string) {
  const rows = await ProgrammingUpload.find({
    termId,
    _id: { $ne: skipId },
  }).lean()
  const texts = await Promise.all(
    rows.map(async (row) => ({
      id: String(row._id),
      label: "Programming upload",
      text: await programmingText(String(row._id)),
    }))
  )
  return texts.filter((item) => item.text.length > 10)
}
