import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { Types } from "mongoose"
import { getEnv } from "@/lib/config/env"
import {
  writePlagiarismHourlyCap,
  writePlagiarismThresholds,
} from "@/lib/catalog/settings"
import { AuditLog } from "@/lib/db/models/audit-log"
import { Course } from "@/lib/db/models/course"
import { StoredFile } from "@/lib/db/models/file"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { PlagiarismCase } from "@/lib/db/models/plagiarism-case"
import { PlagiarismReport } from "@/lib/db/models/plagiarism-report"
import { ProgrammingUpload } from "@/lib/db/models/programming-upload"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import {
  CODE_JOB,
  DEFAULT_PLAGIARISM_THRESHOLDS,
  PLAGIARISM_HOURLY_CAP_DEFAULT,
  PROSE_JOB,
} from "@/lib/domain/plagiarism"
import { plagiarismRateKey } from "@/lib/plagiarism/rate-limit"
import { readyValkey } from "@/lib/valkey"

const ZIP_BYTES = Buffer.from("PK\u0003\u0004seed-zip function main() { return 1 }\n")

async function dropLegacyIndex() {
  try {
    await PlagiarismReport.collection.dropIndex("deliverableId_1")
  } catch {
    // Index may already be gone after the first M06 seed.
  }
}

async function writeDiskFile(
  campusId: string,
  fileId: Types.ObjectId,
  bytes: Buffer
) {
  const dir = path.join(path.resolve(getEnv().FILE_DIR), campusId)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, String(fileId)), bytes)
}

async function seed() {
  await connectMongo()
  await dropLegacyIndex()

  const term = await Term.findOne({
    academicYear: "2026-27",
    name: "Odd Semester 2026",
  })
  const student = await User.findOne({ email: "student.bbsr@cutm.ac.in" })
  const faculty = await User.findOne({ email: "faculty.bbsr@cutm.ac.in" })
  if (!term || !student || !faculty) {
    throw new Error("Run npm run seed:m01, seed:m02, and seed:m05 first.")
  }

  await writePlagiarismThresholds(DEFAULT_PLAGIARISM_THRESHOLDS)
  await writePlagiarismHourlyCap(PLAGIARISM_HOURLY_CAP_DEFAULT)

  const project = await MajorDeliverable.findOne({
    title: "Campus solar tracker",
  })
  const internship = await MajorDeliverable.findOne({
    title: "Rural grid internship",
  })
  const thesis = await MajorDeliverable.findOne({ type: "PG_THESIS" })
  const practice = await Course.findOne({
    code: "ALR-THEORY-PRACTICE-PROJECT",
    termId: term._id,
  })
  if (!project || !internship || !thesis || !practice) {
    throw new Error("Run npm run seed:m02 and seed:m05 first.")
  }

  await PlagiarismReport.deleteMany({
    tool: { $nin: ["STUB_PROSE", "STUB_CODE", "TURNITIN"] },
  })

  await PlagiarismReport.findOneAndUpdate(
    { targetType: "MAJOR_DELIVERABLE", targetId: project._id },
    {
      $set: {
        campusId: project.campusId,
        targetType: "MAJOR_DELIVERABLE",
        targetId: project._id,
        deliverableId: project._id,
        documentType: "PROJECT",
        tool: "STUB_PROSE",
        jobName: PROSE_JOB,
        rawScore: 35,
        score: 35,
        thresholdApplied: 30,
        status: "FLAGGED",
        courseId: project.courseId,
        termId: project.termId,
        matches: [
          {
            id: "a",
            sourceLabel: "Prior solar tracker report",
            overlap: 24,
            excerpt: "The tracker uses an LDR pair on a servo mount.",
          },
          {
            id: "b",
            sourceLabel: "Shared methodology note",
            overlap: 18,
            excerpt: "Calibration was repeated at noon on three days.",
          },
        ],
        exclusions: [],
      },
    },
    { upsert: true }
  )

  await PlagiarismReport.findOneAndUpdate(
    { targetType: "MAJOR_DELIVERABLE", targetId: thesis._id },
    {
      $set: {
        campusId: thesis.campusId,
        targetType: "MAJOR_DELIVERABLE",
        targetId: thesis._id,
        deliverableId: thesis._id,
        documentType: "THESIS",
        tool: "STUB_PROSE",
        jobName: PROSE_JOB,
        rawScore: 12,
        score: 12,
        thresholdApplied: 20,
        status: "CLEAR",
        courseId: thesis.courseId,
        termId: thesis.termId,
        matches: [],
        exclusions: [],
      },
    },
    { upsert: true }
  )

  const internReport = await PlagiarismReport.findOneAndUpdate(
    { targetType: "MAJOR_DELIVERABLE", targetId: internship._id },
    {
      $set: {
        campusId: internship.campusId,
        targetType: "MAJOR_DELIVERABLE",
        targetId: internship._id,
        deliverableId: internship._id,
        documentType: "INTERNSHIP",
        tool: "STUB_PROSE",
        jobName: PROSE_JOB,
        rawScore: 38,
        score: 38,
        thresholdApplied: 30,
        status: "FLAGGED",
        courseId: internship.courseId,
        termId: internship.termId,
        matches: [
          {
            id: "intern-a",
            sourceLabel: "Earlier internship diary",
            overlap: 38,
            excerpt: "Rural feeder load readings were copied weekly.",
          },
        ],
        exclusions: [],
      },
    },
    { upsert: true, returnDocument: "after" }
  )
  if (!internReport) throw new Error("Internship report seed failed.")

  await MajorDeliverable.updateOne(
    { _id: internship._id },
    { $set: { status: "UNDER_COMMITTEE_REVIEW" } }
  )
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await PlagiarismCase.findOneAndUpdate(
    { reportId: internReport._id },
    {
      $set: {
        campusId: internship.campusId,
        reportId: internReport._id,
        targetType: "MAJOR_DELIVERABLE",
        targetId: internship._id,
        deliverableId: internship._id,
        courseId: internship.courseId,
        studentIds: internship.candidateIds,
        committeeMemberIds: [faculty._id],
        assignedBy: faculty._id,
        responseDueAt: due,
        responseExpired: false,
        status: "OPEN",
        statusBeforeCase: "SUBMITTED",
      },
    },
    { upsert: true }
  )

  const existingUpload = await ProgrammingUpload.findOne({
    studentId: student._id,
    courseId: practice._id,
  })
  const zipId = existingUpload?.zipFileId ?? new Types.ObjectId()
  await writeDiskFile(String(practice.campusId), zipId, ZIP_BYTES)
  await StoredFile.findOneAndUpdate(
    { _id: zipId },
    {
      $set: {
        campusId: practice.campusId,
        uploadedBy: student._id,
        originalName: "practice.zip",
        mimeType: "application/zip",
        byteSize: ZIP_BYTES.length,
        storagePath: `${practice.campusId}/${zipId}`,
        kind: "ZIP",
      },
    },
    { upsert: true }
  )
  const upload =
    existingUpload ??
    (await ProgrammingUpload.create({
      campusId: practice.campusId,
      studentId: student._id,
      courseId: practice._id,
      termId: practice.termId,
      zipFileId: zipId,
    }))

  await PlagiarismReport.findOneAndUpdate(
    { targetType: "PROGRAMMING_UPLOAD", targetId: upload._id },
    {
      $set: {
        campusId: practice.campusId,
        targetType: "PROGRAMMING_UPLOAD",
        targetId: upload._id,
        documentType: "PROGRAMMING",
        tool: "STUB_CODE",
        jobName: CODE_JOB,
        rawScore: 12,
        score: 12,
        thresholdApplied: 30,
        status: "CLEAR",
        courseId: practice._id,
        termId: practice.termId,
        matches: [],
        exclusions: [],
      },
    },
    { upsert: true }
  )
  await AuditLog.create({
    actorId: student._id,
    action: "plagiarism.enqueue",
    payload: {
      targetType: "PROGRAMMING_UPLOAD",
      targetId: String(upload._id),
      job: CODE_JOB,
    },
  })

  const valkey = await readyValkey()
  await valkey.set(
    plagiarismRateKey(String(student.campusId)),
    "78",
    "EX",
    2 * 60 * 60
  )

  console.log("M06 seed ready")
  console.log("  Thesis threshold 20 · Project 30 · Internship case OPEN")
  console.log("  Project report 35% with two matches (exclude a → CLEAR)")
  console.log("  Programming job plagiarism.code · hourly usage 78/100")
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
