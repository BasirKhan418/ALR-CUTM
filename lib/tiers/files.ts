import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"
import { getEnv } from "@/lib/config/env"

const KEY = /^[A-Za-z0-9][A-Za-z0-9._-]{0,32}$/

export function assertExportKey(value: string, label: string) {
  if (!KEY.test(value)) {
    throw new Error(`Invalid ${label}.`)
  }
}

export function yearExportRelative(campusId: string, academicYear: string) {
  assertExportKey(academicYear, "academic year")
  assertExportKey(campusId, "campus")
  return path.join("exports", campusId, `year-${academicYear}.json`)
}

export function programExportRelative(campusId: string, studentId: string) {
  assertExportKey(studentId, "student")
  assertExportKey(campusId, "campus")
  return path.join("exports", campusId, `program-${studentId}.json`)
}

function absolute(relativePath: string) {
  const root = path.resolve(getEnv().FILE_DIR)
  const full = path.resolve(root, relativePath)
  if (!full.startsWith(root + path.sep) && full !== root) {
    throw new Error("Export path escaped the file directory.")
  }
  return full
}

export async function writeExportFile(relativePath: string, body: unknown) {
  const full = absolute(relativePath)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, JSON.stringify(body, null, 2))
  return relativePath
}

export async function readExportFile(relativePath: string) {
  return readFile(absolute(relativePath))
}
