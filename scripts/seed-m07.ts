import { Campus } from "@/lib/db/models/campus"
import { Course } from "@/lib/db/models/course"
import { CreditLedger } from "@/lib/db/models/credit-ledger"
import { Department } from "@/lib/db/models/department"
import { Enrollment } from "@/lib/db/models/enrollment"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { ProgramEvaluation } from "@/lib/db/models/program-evaluation"
import { Programme } from "@/lib/db/models/programme"
import { Signoff } from "@/lib/db/models/signoff"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { YearEvaluation } from "@/lib/db/models/year-evaluation"
import { connectMongo } from "@/lib/db/mongo"
import { buildRecordConfigs, deliveryModeFor } from "@/lib/domain/catalog"
import {
  CREDIT_BASKET,
  CREDIT_SOURCE,
  YEAR_CRITERIA,
} from "@/lib/domain/tiers"
import { writeTierSettings } from "@/lib/tiers/settings"
import { processExamCellExport } from "@/workers/processors/exam-cell"

function rubric(marks: number) {
  return YEAR_CRITERIA.map((criterion) => ({
    criterionId: criterion.id,
    marks,
    comment: "",
  }))
}

async function seed() {
  await connectMongo()
  await writeTierSettings({
    yearWiseUsesFiveCriterion: true,
    programWiseUsesFiveCriterion: true,
    programCumulateScale: 100,
  })

  const campus = await Campus.findOne({ slug: "bhubaneswar" })
  const department = await Department.findOne({ campusId: campus?._id, code: "CSE" })
  const programme = await Programme.findOne({
    campusId: campus?._id,
    departmentId: department?._id,
    name: "B.Tech Computer Science",
  })
  const student = await User.findOne({ email: "student.bbsr@cutm.ac.in" })
  const student2 = await User.findOne({ email: "student2.bbsr@cutm.ac.in" })
  const faculty = await User.findOne({ email: "faculty.bbsr@cutm.ac.in" })
  const mentor = await User.findOne({ email: "mentor.bbsr@cutm.ac.in" })
  const dean = await User.findOne({ email: "dean.bbsr@cutm.ac.in" })
  if (
    !campus ||
    !department ||
    !programme ||
    !student ||
    !student2 ||
    !faculty ||
    !mentor ||
    !dean
  ) {
    throw new Error("Run npm run seed:m01 first — Bhubaneswar org or users are missing.")
  }

  await User.updateOne(
    { _id: student._id },
    { $set: { programmeId: programme._id, departmentId: department._id } }
  )
  await User.updateOne(
    { _id: student2._id },
    { $set: { programmeId: programme._id, departmentId: department._id } }
  )

  const committee = await User.findOneAndUpdate(
    { email: "committee.bbsr@cutm.ac.in" },
    {
      $set: {
        name: "Bhubaneswar Committee",
        email: "committee.bbsr@cutm.ac.in",
        campusId: campus._id,
        departmentId: department._id,
        roles: ["COMMITTEE_MEMBER"],
        active: true,
      },
    },
    { upsert: true, returnDocument: "after" }
  )

  const term = await Term.findOneAndUpdate(
    { academicYear: "2025-26", name: "Even Semester 2025" },
    {
      $set: {
        name: "Even Semester 2025",
        academicYear: "2025-26",
        startsAt: new Date("2026-01-01"),
        endsAt: new Date("2026-06-30"),
      },
    },
    { upsert: true, returnDocument: "after" }
  )

  const course = await Course.findOneAndUpdate(
    { code: "ALR-YEAR-2025", termId: term._id },
    {
      $set: {
        campusId: campus._id,
        departmentId: department._id,
        programmeId: programme._id,
        code: "ALR-YEAR-2025",
        title: "Year compile sample",
        termId: term._id,
        combinationCode: "THEORY",
        deliveryMode: deliveryModeFor("THEORY"),
        recordConfigs: buildRecordConfigs("THEORY"),
        createdBy: dean._id,
      },
    },
    { upsert: true, returnDocument: "after" }
  )

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
  await FacultyAssignment.updateOne(
    { courseId: course._id, userId: faculty._id, role: "FACULTY" },
    { $set: { courseId: course._id, userId: faculty._id, role: "FACULTY" } },
    { upsert: true }
  )
  await FacultyAssignment.updateOne(
    { courseId: course._id, userId: mentor._id, role: "MENTOR" },
    { $set: { courseId: course._id, userId: mentor._id, role: "MENTOR" } },
    { upsert: true }
  )

  const shared = {
    studentId: student._id,
    campusId: campus._id,
    departmentId: department._id,
    programmeId: programme._id,
    compiledComponentIds: [],
    committeeIds: [committee._id],
    facultyCoRefs: [],
    creditPosted: true,
    examCellExport: { status: "PENDING" as const },
    status: "SIGNED" as const,
  }

  const yearOne = await YearEvaluation.findOneAndUpdate(
    { studentId: student._id, academicYear: "2024-25" },
    {
      $set: {
        ...shared,
        academicYear: "2024-25",
        rubricScores: rubric(16),
        comments: "First-year compile.",
        mentorPoPso: {
          signedBy: mentor._id,
          at: new Date("2025-06-01T00:00:00.000Z"),
          sheet: "PO/PSO attainment for 2024-25.",
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  )
  const yearTwo = await YearEvaluation.findOneAndUpdate(
    { studentId: student._id, academicYear: "2025-26" },
    {
      $set: {
        ...shared,
        academicYear: "2025-26",
        rubricScores: rubric(18),
        comments: "Second-year compile. Mentor and CO are still open.",
        mentorPoPso: {},
      },
    },
    { upsert: true, returnDocument: "after" }
  )

  await CreditLedger.updateOne(
    { studentId: student._id, academicYear: "2024-25", source: CREDIT_SOURCE },
    {
      $set: {
        studentId: student._id,
        academicYear: "2024-25",
        source: CREDIT_SOURCE,
        credits: 1,
        basket: CREDIT_BASKET,
        postedBy: dean._id,
        postedAt: new Date("2025-06-02T00:00:00.000Z"),
        campusId: campus._id,
        yearEvaluationId: yearOne._id,
      },
    },
    { upsert: true }
  )
  await CreditLedger.updateOne(
    { studentId: student._id, academicYear: "2025-26", source: CREDIT_SOURCE },
    {
      $set: {
        studentId: student._id,
        academicYear: "2025-26",
        source: CREDIT_SOURCE,
        credits: 1,
        basket: CREDIT_BASKET,
        postedBy: dean._id,
        postedAt: new Date("2026-06-02T00:00:00.000Z"),
        campusId: campus._id,
        yearEvaluationId: yearTwo._id,
      },
    },
    { upsert: true }
  )

  await Signoff.deleteMany({
    targetType: "YEAR_EVALUATION",
    targetId: { $in: [yearOne._id, yearTwo._id] },
  })
  await Signoff.create([
    {
      campusId: campus._id,
      targetType: "YEAR_EVALUATION",
      targetId: yearOne._id,
      stepOrder: 1,
      role: "DEAN",
      actorId: dean._id,
      decision: "APPROVED",
      reason: "Year committee constituted.",
      at: new Date("2025-05-20T00:00:00.000Z"),
    },
    {
      campusId: campus._id,
      targetType: "YEAR_EVALUATION",
      targetId: yearOne._id,
      stepOrder: 2,
      role: "COMMITTEE_MEMBER",
      actorId: committee._id,
      decision: "APPROVED",
      reason: "Five-criterion rubric scored. Total 80 / 100.",
      at: new Date("2025-05-28T00:00:00.000Z"),
    },
    {
      campusId: campus._id,
      targetType: "YEAR_EVALUATION",
      targetId: yearOne._id,
      stepOrder: 3,
      role: "MENTOR",
      actorId: mentor._id,
      decision: "APPROVED",
      reason: "PO/PSO attainment for 2024-25.",
      at: new Date("2025-06-01T00:00:00.000Z"),
    },
    {
      campusId: campus._id,
      targetType: "YEAR_EVALUATION",
      targetId: yearOne._id,
      stepOrder: 4,
      role: "DEAN",
      actorId: dean._id,
      decision: "APPROVED",
      reason: "Year signed. 1 ALR credit posted to the Compulsory Basket.",
      at: new Date("2025-06-02T00:00:00.000Z"),
    },
    {
      campusId: campus._id,
      targetType: "YEAR_EVALUATION",
      targetId: yearTwo._id,
      stepOrder: 1,
      role: "DEAN",
      actorId: dean._id,
      decision: "APPROVED",
      reason: "Year committee constituted.",
      at: new Date("2026-05-20T00:00:00.000Z"),
    },
    {
      campusId: campus._id,
      targetType: "YEAR_EVALUATION",
      targetId: yearTwo._id,
      stepOrder: 2,
      role: "COMMITTEE_MEMBER",
      actorId: committee._id,
      decision: "APPROVED",
      reason: "Five-criterion rubric scored. Total 90 / 100.",
      at: new Date("2026-05-28T00:00:00.000Z"),
    },
    {
      campusId: campus._id,
      targetType: "YEAR_EVALUATION",
      targetId: yearTwo._id,
      stepOrder: 3,
      role: "DEAN",
      actorId: dean._id,
      decision: "APPROVED",
      reason: "Year signed. 1 ALR credit posted to the Compulsory Basket.",
      at: new Date("2026-06-02T00:00:00.000Z"),
    },
  ])

  const existingProgram = await ProgramEvaluation.findOne({ studentId: student._id })
  if (existingProgram) {
    await Signoff.deleteMany({
      targetType: "PROGRAM_EVALUATION",
      targetId: existingProgram._id,
    })
    await existingProgram.deleteOne()
  }

  await processExamCellExport({
    campusId: String(campus._id),
    academicYear: "2024-25",
    yearEvaluationId: String(yearOne._id),
  })

  console.log("seed-m07: 2 / 4 compulsory ALR credits for student.bbsr@cutm.ac.in")
  console.log("  2024-25 rubric 80, credit posted, exam-cell JSON ready")
  console.log("  2025-26 rubric 90, credit posted, PO/PSO and CO still open")
  console.log("  cumulation preview (80 + 90) / 2 × 100/100 = 85")
  console.log("  committee.bbsr@cutm.ac.in  COMMITTEE_MEMBER")
  console.log("  faculty.bbsr@cutm.ac.in can sign CO and cannot sign PO/PSO")
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
