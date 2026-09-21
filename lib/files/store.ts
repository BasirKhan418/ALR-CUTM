import { createHash, randomBytes } from "crypto"
import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import { Types } from "mongoose"
import { getEnv } from "@/lib/config/env"
import { StoredFile, type FileKind } from "@/lib/db/models/file"

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
export const PDF_MIME = "application/pdf"
const MAX_BYTES = 20 * 1024 * 1024

function fileRoot() {
  return path.resolve(getEnv().FILE_DIR)
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex")
}

export function newRawToken() {
  return randomBytes(32).toString("hex")
}

export function detectKind(file: File): FileKind | null {
  const name = file.name.toLowerCase()
  if (name.endsWith(".docx") || file.type === DOCX_MIME) return "DOCX"
  if (name.endsWith(".pdf") || file.type === PDF_MIME) return "PDF"
  return null
}

export async function saveUploadedFile(input: {
  file: File
  kind: FileKind
  campusId: string
  uploadedBy: string
}) {
  if (!(input.file instanceof File) || input.file.size === 0) {
    return { ok: false as const, message: "Choose a file." }
  }
  if (input.file.size > MAX_BYTES) {
    return { ok: false as const, message: "Files must be 20 MB or smaller." }
  }
  const detected = detectKind(input.file)
  if (input.kind === "DOCX" && detected !== "DOCX") {
    return { ok: false as const, message: "Word file must be a .docx." }
  }
  if ((input.kind === "PDF" || input.kind === "PROOF") && detected !== "PDF") {
    return { ok: false as const, message: "That file must be a PDF." }
  }

  const id = new Types.ObjectId()
  const dir = path.join(fileRoot(), input.campusId)
  await mkdir(dir, { recursive: true })
  const storagePath = path.join(input.campusId, String(id))
  const bytes = Buffer.from(await input.file.arrayBuffer())
  await writeFile(path.join(fileRoot(), storagePath), bytes)

  await StoredFile.create({
    _id: id,
    campusId: input.campusId,
    uploadedBy: input.uploadedBy,
    originalName: input.file.name,
    mimeType: input.file.type || (detected === "DOCX" ? DOCX_MIME : PDF_MIME),
    byteSize: bytes.length,
    storagePath,
    kind: input.kind,
  })

  return { ok: true as const, fileId: String(id) }
}

export async function readStoredFile(storagePath: string) {
  return readFile(path.join(fileRoot(), storagePath))
}
