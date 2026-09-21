import { NextResponse } from "next/server"
import { Types } from "mongoose"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { StoredFile } from "@/lib/db/models/file"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { PaperPublication } from "@/lib/db/models/paper-publication"
import { PlagiarismReport } from "@/lib/db/models/plagiarism-report"
import { ProgrammingUpload } from "@/lib/db/models/programming-upload"
import { connectMongo } from "@/lib/db/mongo"
import { readStoredFile } from "@/lib/files/store"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession()
  const { id } = await context.params
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }
  await connectMongo()
  const file = await StoredFile.findById(id).lean()
  if (!file) return NextResponse.json({ ok: false }, { status: 404 })

  const deliverable = await MajorDeliverable.findOne({
    $or: [{ wordFileId: file._id }, { pdfFileId: file._id }],
  }).lean()
  const publication = deliverable
    ? null
    : await PaperPublication.findOne({ proofFileId: file._id }).lean()
  const programming = !deliverable && !publication
    ? await ProgrammingUpload.findOne({ zipFileId: file._id }).lean()
    : null
  const report = !deliverable && !publication && !programming
    ? await PlagiarismReport.findOne({ "exclusions.certificateFileId": file._id }).lean()
    : null
  const owner = deliverable
    ?? (publication
      ? await MajorDeliverable.findById(publication.deliverableId).lean()
      : report?.deliverableId
        ? await MajorDeliverable.findById(report.deliverableId).lean()
        : null)

  if (programming) {
    const ownerStudent = String(programming.studentId) === session.userId
    const assigned = await FacultyAssignment.findOne({
      courseId: programming.courseId,
      userId: session.userId,
      role: "FACULTY",
    })
    const office =
      hasRole(session, "ADMIN") ||
      (hasRole(session, "DEAN") && session.campusId === String(programming.campusId))
    if (!ownerStudent && !assigned && !office) {
      return NextResponse.json({ ok: false }, { status: 403 })
    }
  } else if (owner) {
    const candidate = owner.candidateIds.some(
      (item: Types.ObjectId) => String(item) === session.userId
    )
    const supervisor =
      String(owner.supervisorId) === session.userId ||
      String(owner.coSupervisorId) === session.userId
    const assigned = await FacultyAssignment.findOne({
      courseId: owner.courseId,
      userId: session.userId,
      role: "FACULTY",
    })
    const office =
      (hasRole(session, "HOD") && session.departmentId === String(owner.departmentId)) ||
      (hasRole(session, "DEAN") && session.campusId === String(owner.campusId)) ||
      hasRole(session, "ADMIN")
    if (!candidate && !supervisor && !assigned && !office) {
      return NextResponse.json({ ok: false }, { status: 403 })
    }
  } else if (report) {
    const assigned = report.courseId
      ? await FacultyAssignment.findOne({
          courseId: report.courseId,
          userId: session.userId,
          role: "FACULTY",
        })
      : null
    const certifier = report.exclusions.some(
      (item: { bySupervisorId?: Types.ObjectId }) =>
        String(item.bySupervisorId) === session.userId
    )
    const office =
      hasRole(session, "ADMIN") ||
      (hasRole(session, "DEAN") && session.campusId === String(report.campusId))
    if (!assigned && !certifier && !office) {
      return NextResponse.json({ ok: false }, { status: 403 })
    }
  } else {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  const bytes = await readStoredFile(file.storagePath)
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.originalName.replaceAll('"', "")}"`,
    },
  })
}
