import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { Types } from "mongoose"
import { Course } from "@/lib/db/models/course"
import { Enrollment } from "@/lib/db/models/enrollment"
import { StoredFile } from "@/lib/db/models/file"
import { IndustryToken } from "@/lib/db/models/industry-token"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { PaperPublication } from "@/lib/db/models/paper-publication"
import { Signoff } from "@/lib/db/models/signoff"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { getEnv } from "@/lib/config/env"
import { internshipReportTotal } from "@/lib/domain/internship"
import { hashToken } from "@/lib/files/store"
import { recomputeSubjectScore } from "@/lib/scoring/recompute"
import { readyValkey } from "@/lib/valkey"

const INDUSTRY_TOKEN = "m05-industry-seed-token"
const DOCX_BYTES = Buffer.from("PK\u0003\u0004seed-docx")
const PDF_BYTES = Buffer.from("%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n")

async function seed() {
  await connectMongo()

  const term = await Term.findOne({
    academicYear: "2026-27",
    name: "Odd Semester 2026",
  })
  const student = await User.findOne({ email: "student.bbsr@cutm.ac.in" })
  const faculty = await User.findOne({ email: "faculty.bbsr@cutm.ac.in" })
  const supervisor = await User.findOne({ email: "supervisor.bbsr@cutm.ac.in" })
  const hod = await User.findOne({ email: "hod.bbsr@cutm.ac.in" })
  if (!term || !student || !faculty || !supervisor || !hod) {
    throw new Error("Run npm run seed:m01 and seed:m02 first.")
  }

  const student2 =
    (await User.findOne({ email: "student2.bbsr@cutm.ac.in" })) ??
    (await User.create({
      name: "Bhubaneswar Student Two",
      email: "student2.bbsr@cutm.ac.in",
      campusId: student.campusId,
      departmentId: student.departmentId,
      roles: ["STUDENT"],
      active: true,
      registrationNo: "BBSR-STU-002",
    }))

  const project = await Course.findOne({ code: "ALR-PROJECT", termId: term._id })
  const internship = await Course.findOne({
    code: "ALR-INTERNSHIP",
    termId: term._id,
  })
  const thesis = await Course.findOne({ code: "ALR-THESIS", termId: term._id })
  if (!project || !internship || !thesis) {
    throw new Error("Run npm run seed:m02 first — ALR-PROJECT / INTERNSHIP / THESIS are missing.")
  }

  for (const course of [project, internship, thesis]) {
    await Enrollment.updateOne(
      { studentId: student._id, courseId: course._id, termId: term._id },
      {
        $set: {
          studentId: student._id,
          courseId: course._id,
          termId: term._id,
        },
      },
      { upsert: true }
    )
  }
  await Enrollment.updateOne(
    { studentId: student2._id, courseId: project._id, termId: term._id },
    {
      $set: {
        studentId: student2._id,
        courseId: project._id,
        termId: term._id,
      },
    },
    { upsert: true }
  )

  const projectWord = await seedFile({
    campusId: project.campusId,
    uploadedBy: student._id,
    originalName: "solar-tracker.docx",
    kind: "DOCX",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: DOCX_BYTES,
  })
  const projectPdf = await seedFile({
    campusId: project.campusId,
    uploadedBy: student._id,
    originalName: "solar-tracker.pdf",
    kind: "PDF",
    mimeType: "application/pdf",
    bytes: PDF_BYTES,
  })
  const internWord = await seedFile({
    campusId: internship.campusId,
    uploadedBy: student._id,
    originalName: "industry-log.docx",
    kind: "DOCX",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: DOCX_BYTES,
  })
  const internPdf = await seedFile({
    campusId: internship.campusId,
    uploadedBy: student._id,
    originalName: "industry-log.pdf",
    kind: "PDF",
    mimeType: "application/pdf",
    bytes: PDF_BYTES,
  })
  const thesisWord = await seedFile({
    campusId: thesis.campusId,
    uploadedBy: student._id,
    originalName: "pg-thesis.docx",
    kind: "DOCX",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes: DOCX_BYTES,
  })
  const thesisPdf = await seedFile({
    campusId: thesis.campusId,
    uploadedBy: student._id,
    originalName: "pg-thesis.pdf",
    kind: "PDF",
    mimeType: "application/pdf",
    bytes: PDF_BYTES,
  })
  const proofPdf = await seedFile({
    campusId: thesis.campusId,
    uploadedBy: student._id,
    originalName: "paper-proof.pdf",
    kind: "PROOF",
    mimeType: "application/pdf",
    bytes: PDF_BYTES,
  })

  const sharedProject = await MajorDeliverable.findOneAndUpdate(
    { courseId: project._id, type: "MAJOR_PROJECT", title: "Campus solar tracker" },
    {
      $set: {
        campusId: project.campusId,
        departmentId: project.departmentId,
        programmeId: project.programmeId,
        courseId: project._id,
        termId: term._id,
        type: "MAJOR_PROJECT",
        title: "Campus solar tracker",
        branch: "CSE",
        candidateIds: [student._id, student2._id],
        candidates: [
          {
            userId: student._id,
            name: student.name,
            email: student.email,
            registrationNo: student.registrationNo ?? "BBSR-STU-001",
          },
          {
            userId: student2._id,
            name: student2.name,
            email: student2.email,
            registrationNo: student2.registrationNo ?? "BBSR-STU-002",
          },
        ],
        supervisorId: supervisor._id,
        wordFileId: projectWord._id,
        pdfFileId: projectPdf._id,
        status: "SUBMITTED",
        createdBy: student._id,
      },
      $unset: { coSupervisorId: 1 },
    },
    { upsert: true, returnDocument: "after" }
  )
  await replaceSteps(String(project.campusId), "MAJOR_DELIVERABLE", String(sharedProject._id), [
    { role: "STUDENT", decision: "APPROVED", actorId: student._id },
    {
      role: "SUPERVISOR",
      decision: "APPROVED",
      actorId: supervisor._id,
    },
    {
      role: "HOD",
      decision: "RETURNED",
      actorId: hod._id,
      reason: "Add the methodology chapter before HoD sign-off.",
    },
    { role: "STUDENT", decision: "APPROVED", actorId: student._id },
    { role: "SUPERVISOR", decision: "PENDING" },
    { role: "HOD", decision: "PENDING" },
  ])
  const internTotal = internshipReportTotal(40, 40)
  const internRow = await MajorDeliverable.findOneAndUpdate(
    { courseId: internship._id, type: "INTERNSHIP", title: "Rural grid internship" },
    {
      $set: {
        campusId: internship.campusId,
        departmentId: internship.departmentId,
        programmeId: internship.programmeId,
        courseId: internship._id,
        termId: term._id,
        type: "INTERNSHIP",
        title: "Rural grid internship",
        branch: "CSE",
        candidateIds: [student._id],
        candidates: [
          {
            userId: student._id,
            name: student.name,
            email: student.email,
            registrationNo: student.registrationNo ?? "BBSR-STU-001",
          },
        ],
        supervisorId: supervisor._id,
        industrySupervisor: {
          name: "Priya Industry",
          email: "industry@example.com",
          org: "CUTM Partner Works",
        },
        wordFileId: internWord._id,
        pdfFileId: internPdf._id,
        status: "APPROVED",
        internScores: { internal: 40, external: 40, total: internTotal },
        industryFeedback: {
          attendance: "Present on all scheduled days.",
          stipend: "Paid",
          taskCompletion: "Completed the load-survey tasks.",
          feedback: "Reliable and clear reports.",
        },
        rubricScores: { total: internTotal, remarks: "Industry: Reliable and clear reports." },
        createdBy: student._id,
      },
    },
    { upsert: true, returnDocument: "after" }
  )
  await replaceSteps(String(internship.campusId), "MAJOR_DELIVERABLE", String(internRow._id), [
    { role: "STUDENT", decision: "APPROVED", actorId: student._id },
    { role: "SUPERVISOR", decision: "APPROVED", actorId: supervisor._id },
    { role: "HOD", decision: "APPROVED", actorId: hod._id },
  ])
  const tokenHash = hashToken(INDUSTRY_TOKEN)
  await IndustryToken.findOneAndUpdate(
    { tokenHash },
    {
      $set: {
        campusId: internship.campusId,
        deliverableId: internRow._id,
        tokenHash,
        issuedBy: supervisor._id,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        usedAt: new Date(),
      },
    },
    { upsert: true }
  )
  const valkey = await readyValkey()
  await valkey.set(
    `token:industry:${tokenHash}`,
    String(internRow._id),
    "EX",
    14 * 24 * 60 * 60
  )
  await recomputeSubjectScore(String(student._id), String(internship._id), "INTERNSHIP_REPORT")

  const thesisRow = await MajorDeliverable.findOneAndUpdate(
    { courseId: thesis._id, type: "PG_THESIS", title: "Low-cost sensor thesis" },
    {
      $set: {
        campusId: thesis.campusId,
        departmentId: thesis.departmentId,
        programmeId: thesis.programmeId,
        courseId: thesis._id,
        termId: term._id,
        type: "PG_THESIS",
        title: "Low-cost sensor thesis",
        branch: "CSE",
        candidateIds: [student._id],
        candidates: [
          {
            userId: student._id,
            name: student.name,
            email: student.email,
            registrationNo: student.registrationNo ?? "BBSR-STU-001",
          },
        ],
        supervisorId: supervisor._id,
        coSupervisorId: faculty._id,
        wordFileId: thesisWord._id,
        pdfFileId: thesisPdf._id,
        status: "DRAFT",
        createdBy: student._id,
      },
    },
    { upsert: true, returnDocument: "after" }
  )
  const publication = await PaperPublication.findOneAndUpdate(
    { deliverableId: thesisRow._id },
    {
      $set: {
        campusId: thesis.campusId,
        deliverableId: thesisRow._id,
        title: "Low-cost soil moisture sensing",
        venue: "CUTM Student Symposium",
        proofFileId: proofPdf._id,
        status: "SUBMITTED",
        createdBy: student._id,
      },
    },
    { upsert: true, returnDocument: "after" }
  )
  await replaceSteps(String(thesis.campusId), "PAPER_PUBLICATION", String(publication._id), [
    { role: "STUDENT", decision: "APPROVED", actorId: student._id },
    { role: "SUPERVISOR", decision: "PENDING" },
    { role: "CO_SUPERVISOR", decision: "PENDING" },
    { role: "HOD", decision: "PENDING" },
  ])
  await Signoff.deleteMany({
    targetType: "MAJOR_DELIVERABLE",
    targetId: thesisRow._id,
  })

  console.log("seed-m05: shared Major Project on ALR-PROJECT (HoD return + resubmit history)")
  console.log("seed-m05: internship 40 + 40 = 24 / 30 on ALR-INTERNSHIP")
  console.log(
    `seed-m05: industry token (logged-out) ${getEnv().APP_URL.replace(/\/$/, "")}/industry/${INDUSTRY_TOKEN}`
  )
  console.log("seed-m05: PG Thesis stays DRAFT until publication is approved")
  process.exit(0)
}

async function seedFile(input: {
  campusId: Types.ObjectId
  uploadedBy: Types.ObjectId
  originalName: string
  kind: "DOCX" | "PDF" | "PROOF"
  mimeType: string
  bytes: Buffer
}) {
  const existing = await StoredFile.findOne({
    uploadedBy: input.uploadedBy,
    originalName: input.originalName,
    kind: input.kind,
  })
  if (existing) return existing
  const id = new Types.ObjectId()
  const storagePath = path.join(String(input.campusId), String(id))
  const dir = path.join(path.resolve(getEnv().FILE_DIR), String(input.campusId))
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(path.resolve(getEnv().FILE_DIR), storagePath), input.bytes)
  return StoredFile.create({
    _id: id,
    campusId: input.campusId,
    uploadedBy: input.uploadedBy,
    originalName: input.originalName,
    mimeType: input.mimeType,
    byteSize: input.bytes.length,
    storagePath,
    kind: input.kind,
  })
}

async function replaceSteps(
  campusId: string,
  targetType: "MAJOR_DELIVERABLE" | "PAPER_PUBLICATION",
  targetId: string,
  steps: {
    role: string
    decision: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED"
    actorId?: Types.ObjectId
    reason?: string
  }[]
) {
  await Signoff.deleteMany({ targetType, targetId })
  await Signoff.insertMany(
    steps.map((step, index) => ({
      campusId,
      targetType,
      targetId,
      stepOrder: index + 1,
      role: step.role,
      actorId: step.actorId,
      decision: step.decision,
      reason: step.reason,
      at: step.decision === "PENDING" ? undefined : new Date(),
    }))
  )
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
