import { Types } from "mongoose"
import { ExportRequest } from "@/lib/db/models/export-request"
import { connectMongo } from "@/lib/db/mongo"
import { gatherBooklet, gatherWorkshop } from "@/lib/exports/gather"
import { renderBooklet, renderWorkshopCertificate } from "@/lib/exports/pdf"
import { saveGeneratedFile } from "@/lib/files/store"

export async function processBookletExport(data: { requestId?: string }) {
  if (!data.requestId) return
  await connectMongo()
  const request = await ExportRequest.findById(data.requestId)
  if (!request || request.status === "READY") return

  try {
    const bytes =
      request.kind === "WORKSHOP"
        ? Buffer.from(
            await renderWorkshopCertificate(
              await gatherWorkshop({
                studentId: String(request.studentId),
                courseId: String(request.courseId ?? ""),
              })
            )
          )
        : Buffer.from(
            await renderBooklet(
              await gatherBooklet({
                studentId: String(request.studentId),
                scope: request.scope === "PROGRAM" ? "PROGRAM" : "YEAR",
                academicYear: request.academicYear,
              })
            )
          )
    const fileId = await saveGeneratedFile({
      campusId: String(request.campusId),
      uploadedBy: String(request.requestedBy),
      originalName:
        request.kind === "WORKSHOP" ? "workshop-hours.pdf" : "learning-record.pdf",
      bytes,
    })
    request.status = "READY"
    request.fileId = new Types.ObjectId(fileId)
    request.error = undefined
    await request.save()
  } catch (error) {
    request.status = "FAILED"
    request.error = error instanceof Error ? error.message.slice(0, 300) : "Export failed."
    await request.save()
    throw error
  }
}
