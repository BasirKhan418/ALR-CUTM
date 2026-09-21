"use server"

import { IndustryToken } from "@/lib/db/models/industry-token"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { connectMongo } from "@/lib/db/mongo"
import {
  internshipReportTotal,
  validateInternshipHalf,
} from "@/lib/domain/internship"
import { recordTypeForDeliverable } from "@/lib/domain/deliverable"
import { hashToken } from "@/lib/files/store"
import { recomputeSubjectScore } from "@/lib/scoring/recompute"
import { readyValkey } from "@/lib/valkey"
import { revalidatePath } from "next/cache"

export type IndustryFormState = {
  ok: boolean
  message?: string
}

export async function lookupIndustryToken(raw: string) {
  const tokenHash = hashToken(raw)
  await connectMongo()
  const valkey = await readyValkey()
  const cached = await valkey.get(`token:industry:${tokenHash}`)
  const row = await IndustryToken.findOne({ tokenHash }).lean()
  if (!row) return { status: "invalid" as const }
  if (row.expiresAt.getTime() < Date.now()) {
    return { status: "expired" as const }
  }
  if (!cached) {
    const ttl = Math.max(1, Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000))
    await valkey.set(`token:industry:${tokenHash}`, String(row.deliverableId), "EX", ttl)
  }
  const deliverable = await MajorDeliverable.findById(row.deliverableId).lean()
  if (!deliverable || deliverable.type !== "INTERNSHIP") {
    return { status: "invalid" as const }
  }
  return {
    status: "ok" as const,
    tokenHash,
    deliverableId: String(deliverable._id),
    title: deliverable.title || "Internship",
    students: deliverable.candidates.map((item: { name: string }) => item.name),
    org: deliverable.industrySupervisor?.org ?? "",
    externalScore: deliverable.internScores?.external ?? null,
    alreadySaved: Boolean(deliverable.industryFeedback?.feedback),
    attendance: deliverable.industryFeedback?.attendance ?? "",
    stipend: deliverable.industryFeedback?.stipend ?? "",
    taskCompletion: deliverable.industryFeedback?.taskCompletion ?? "",
    feedback: deliverable.industryFeedback?.feedback ?? "",
  }
}

export async function saveIndustryFeedback(
  _prev: IndustryFormState,
  formData: FormData
): Promise<IndustryFormState> {
  const raw = String(formData.get("token") ?? "").trim()
  if (!raw) return { ok: false, message: "This industry link is not valid." }
  const found = await lookupIndustryToken(raw)
  if (found.status !== "ok") {
    return {
      ok: false,
      message:
        found.status === "expired"
          ? "This industry link has expired. Ask the university supervisor to issue a new one."
          : "This industry link is not valid.",
    }
  }

  const attendance = String(formData.get("attendance") ?? "").trim()
  const stipend = String(formData.get("stipend") ?? "").trim()
  const taskCompletion = String(formData.get("taskCompletion") ?? "").trim()
  const feedback = String(formData.get("feedback") ?? "").trim()
  const external = Number(formData.get("externalScore") ?? "")
  if (!attendance || !stipend || !taskCompletion || !feedback) {
    return { ok: false, message: "Fill attendance, stipend, task completion, and feedback." }
  }
  const invalid = validateInternshipHalf(external, "External score")
  if (invalid) return { ok: false, message: invalid }

  await connectMongo()
  const deliverable = await MajorDeliverable.findById(found.deliverableId)
  if (!deliverable) return { ok: false, message: "Internship record was not found." }
  const internScores = { ...(deliverable.internScores ?? {}), external }
  if (Number.isFinite(internScores.internal)) {
    internScores.total = internshipReportTotal(Number(internScores.internal), external)
  }
  deliverable.internScores = internScores
  deliverable.industryFeedback = {
    attendance,
    stipend,
    taskCompletion,
    feedback,
  }
  if (internScores.total !== undefined) {
    deliverable.rubricScores = {
      total: internScores.total,
      remarks: `Industry: ${feedback}`,
    }
  }
  deliverable.industrySupervisor = {
    name: deliverable.industrySupervisor?.name ?? "",
    email: deliverable.industrySupervisor?.email ?? "",
    org: deliverable.industrySupervisor?.org ?? "",
  }
  await deliverable.save()
  await IndustryToken.updateOne(
    { tokenHash: found.tokenHash },
    { $set: { usedAt: new Date() } }
  )
  if (internScores.total !== undefined) {
    const recordType = recordTypeForDeliverable(deliverable.type)
    for (const candidateId of deliverable.candidateIds) {
      await recomputeSubjectScore(
        String(candidateId),
        String(deliverable.courseId),
        recordType
      )
    }
  }
  revalidatePath(`/industry/${raw}`)
  revalidatePath(`/student/courses/${String(deliverable.courseId)}`)
  return {
    ok: true,
    message: Number.isFinite(internScores.internal)
      ? `External score saved. Report total is ${internScores.total} / 30.`
      : "External score saved. The university internal score will complete the 30-point total.",
  }
}
