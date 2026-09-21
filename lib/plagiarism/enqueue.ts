import { AuditLog } from "@/lib/db/models/audit-log"
import { PlagiarismReport } from "@/lib/db/models/plagiarism-report"
import { connectMongo } from "@/lib/db/mongo"
import { readPlagiarismThresholds } from "@/lib/catalog/settings"
import {
  CODE_JOB,
  PROSE_JOB,
  type PlagiarismDocumentType,
  type PlagiarismTargetType,
} from "@/lib/domain/plagiarism"
import { codeSimilarityQueue, plagiarismQueue } from "@/lib/queue/queues"

export async function enqueuePlagiarismScan(input: {
  campusId: string
  targetType: PlagiarismTargetType
  targetId: string
  documentType: PlagiarismDocumentType
  job: typeof PROSE_JOB | typeof CODE_JOB
  deliverableId?: string
  courseId?: string
  termId?: string
  actorId?: string
}) {
  if (
    input.documentType === "PROGRAMMING" ||
    input.targetType === "PROGRAMMING_UPLOAD"
  ) {
    if (input.job !== CODE_JOB) {
      throw new Error("Programming uploads must use the code-similarity queue.")
    }
  } else if (input.job === CODE_JOB) {
    throw new Error("Prose documents cannot use the code-similarity queue.")
  }
  await connectMongo()
  const thresholds = await readPlagiarismThresholds()
  const thresholdApplied = thresholds[input.documentType]
  const tool = input.job === CODE_JOB ? "STUB_CODE" : "STUB_PROSE"
  await PlagiarismReport.findOneAndUpdate(
    { targetType: input.targetType, targetId: input.targetId },
    {
      $set: {
        campusId: input.campusId,
        targetType: input.targetType,
        targetId: input.targetId,
        deliverableId: input.deliverableId,
        documentType: input.documentType,
        tool,
        jobName: input.job,
        thresholdApplied,
        status: "PENDING",
        courseId: input.courseId,
        termId: input.termId,
      },
      $unset: { score: 1, rawScore: 1 },
    },
    { upsert: true }
  )
  const queue = input.job === CODE_JOB ? codeSimilarityQueue() : plagiarismQueue()
  await queue.add(
    input.job,
    {
      campusId: input.campusId,
      targetType: input.targetType,
      targetId: input.targetId,
      documentType: input.documentType,
    },
    { removeOnComplete: 100, attempts: 8, backoff: { type: "exponential", delay: 15_000 } }
  )
  if (input.actorId) {
    await AuditLog.create({
      actorId: input.actorId,
      action: "plagiarism.enqueue",
      payload: {
        targetType: input.targetType,
        targetId: input.targetId,
        job: input.job,
      },
    })
  }
}
