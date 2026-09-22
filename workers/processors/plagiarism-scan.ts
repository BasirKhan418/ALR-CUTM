import { DelayedError, type Job } from "bullmq"
import { PlagiarismReport } from "@/lib/db/models/plagiarism-report"
import { connectMongo } from "@/lib/db/mongo"
import { CODE_JOB, PROSE_JOB, plagiarismRetryDelayMs } from "@/lib/domain/plagiarism"
import { openCaseIfNeeded } from "@/lib/plagiarism/cases"
import {
  codeCorpus,
  deliverableText,
  lrEntryText,
  programmingText,
  proseCorpus,
} from "@/lib/plagiarism/text"
import { consumePlagiarismSlot } from "@/lib/plagiarism/rate-limit"
import { providerFor } from "@/lib/plagiarism/provider"

type ScanJob = {
  campusId: string
  targetType: "MAJOR_DELIVERABLE" | "LR_ENTRY" | "PROGRAMMING_UPLOAD"
  targetId: string
}

export async function processPlagiarismScan(job: Job<ScanJob>) {
  await connectMongo()
  const slot = await consumePlagiarismSlot(job.data.campusId)
  if (!slot.allowed) {
    await job.moveToDelayed(Date.now() + plagiarismRetryDelayMs(slot.percent))
    throw new DelayedError()
  }

  const report = await PlagiarismReport.findOne({
    targetType: job.data.targetType,
    targetId: job.data.targetId,
  })
  if (!report) return { skipped: true }
  const wantsCode = job.name === CODE_JOB
  const isProgramming = job.data.targetType === "PROGRAMMING_UPLOAD"
  if (wantsCode !== isProgramming) {
    report.status = "FAILED"
    await report.save()
    throw new Error("Programming files cannot run on the prose queue.")
  }

  try {
    const kind = wantsCode ? "code" : "prose"
    const source =
      job.data.targetType === "MAJOR_DELIVERABLE"
        ? await deliverableText(job.data.targetId)
        : job.data.targetType === "LR_ENTRY"
          ? await lrEntryText(job.data.targetId)
          : await programmingText(job.data.targetId)
    const termId = report.termId ? String(report.termId) : ""
    const corpus = termId
      ? kind === "code"
        ? await codeCorpus(termId, job.data.targetId)
        : await proseCorpus(termId, job.data.targetId)
      : []
    const result = await providerFor(kind).analyze({
      files: [{ path: job.data.targetId, mime: "text/plain", text: source }],
      corpus,
    })
    report.rawScore = result.score
    report.score = result.score
    report.matches = result.matches
    report.exclusions = []
    report.status = result.score > report.thresholdApplied ? "FLAGGED" : "CLEAR"
    report.jobName = job.name === CODE_JOB ? CODE_JOB : PROSE_JOB
    report.tool = kind === "code" ? "STUB_CODE" : "STUB_PROSE"
    await report.save()
    if (report.status === "FLAGGED") {
      await openCaseIfNeeded(String(report._id), { reopenIfClosed: true })
    }
    return { score: report.score, status: report.status, job: report.jobName }
  } catch (error) {
    report.status = "FAILED"
    await report.save()
    throw error
  }
}
