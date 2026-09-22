import { NextResponse } from "next/server"
import { Types } from "mongoose"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { connectMongo } from "@/lib/db/mongo"
import { ExportRequest } from "@/lib/db/models/export-request"
import { StoredFile } from "@/lib/db/models/file"
import { canReadStudentRecord } from "@/lib/exports/access"
import { readStoredFile } from "@/lib/files/store"

export async function GET(request: Request) {
  const session = await requireSession()
  const id = new URL(request.url).searchParams.get("request") ?? ""
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, message: "Request is required." }, { status: 400 })
  }
  await connectMongo()
  const row = await ExportRequest.findById(id).lean()
  if (!row || row.status !== "READY" || !row.fileId) {
    return NextResponse.json({ ok: false, message: "Export file is not ready." }, { status: 404 })
  }
  const studentId = String(row.studentId)
  const ownsRequest =
    session.userId === String(row.requestedBy) || session.userId === studentId
  if (!ownsRequest && !(await canReadStudentRecord(session, studentId))) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 })
  }
  if (
    hasRole(session, "STUDENT") &&
    session.userId !== studentId &&
    session.userId !== String(row.requestedBy)
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 })
  }
  const file = await StoredFile.findById(row.fileId).lean()
  if (!file) {
    return NextResponse.json({ ok: false, message: "Export file is missing." }, { status: 404 })
  }
  const body = await readStoredFile(file.storagePath)
  const filename = row.kind === "WORKSHOP" ? "workshop-hours.pdf" : "learning-record.pdf"
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
