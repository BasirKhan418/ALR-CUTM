import { Types } from "mongoose"
import { AiScoreRun } from "@/lib/db/models/ai-score-run"
import { ClassroomComponents } from "@/lib/db/models/classroom-components"
import { Course } from "@/lib/db/models/course"
import { Enrollment } from "@/lib/db/models/enrollment"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import type { CourseRecordConfig } from "@/lib/domain/catalog"
import { recomputeSubjectScore } from "@/lib/scoring/recompute"

const CLASSROOM_SPLIT = {
  assignment: 2,
  presentation: 2,
  midsem: 3,
  record: 3,
}

async function seed() {
  await connectMongo()

  const student = await User.findOne({ email: "student.bbsr@cutm.ac.in" })
  const faculty = await User.findOne({ email: "faculty.bbsr@cutm.ac.in" })
  const term = await Term.findOne({
    academicYear: "2026-27",
    name: "Odd Semester 2026",
  })
  if (!student || !faculty || !term) {
    throw new Error("Run npm run seed:m01 and seed:m02 first.")
  }

  const combo = await Course.findOne({
    code: "ALR-THEORY-PRACTICE-PROJECT",
    termId: term._id,
  })
  const workshop = await Course.findOne({
    code: "ALR-WORKSHOP",
    termId: term._id,
  })
  if (!combo || !workshop) {
    throw new Error("Run npm run seed:m02 first — ALR catalog courses are missing.")
  }

  for (const course of [combo, workshop]) {
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

  combo.recordConfigs = combo.recordConfigs.map((config: CourseRecordConfig) => {
    const plain = JSON.parse(JSON.stringify(config))
    return plain.recordType === "CLASSROOM_LEARNING"
      ? { ...plain, compositeWeights: CLASSROOM_SPLIT }
      : plain
  })
  combo.markModified("recordConfigs")
  await combo.save()

  const appliedA = await upsertEntry({
    campusId: combo.campusId,
    studentId: student._id,
    courseId: combo._id,
    termId: term._id,
    recordType: "APPLIED_ACTION_LEARNING",
    experimentNo: 1,
    title: "Ohm’s law bench",
    concept: "Relationship of V, I, and R on a resistive circuit.",
    planning: "Wired the circuit, recorded three voltage steps.",
    result: "Slope matched the known resistor within 4%.",
    recordNotes: "Table and graph attached in the booklet.",
    vivaNotes: "Explained sources of contact resistance.",
    booksManuals: "Lab manual unit 2",
    facultyScores: { concept: 8, planning: 8, result: 8, record: 8, viva: 8 },
    facultyRemarks: "Clear method. Watch significant figures.",
    scoredBy: faculty._id,
  })

  const appliedB = await upsertEntry({
    campusId: combo.campusId,
    studentId: student._id,
    courseId: combo._id,
    termId: term._id,
    recordType: "APPLIED_ACTION_LEARNING",
    experimentNo: 2,
    title: "Wheatstone bridge",
    concept: "Unknown resistance from a balanced ratio.",
    planning: "Null the galvanometer, then compute Rx.",
    result: "Unknown matched the stamped value.",
    recordNotes: "Balance points tabulated.",
    vivaNotes: "Discussed sensitivity of the bridge.",
    booksManuals: "Lab manual unit 3",
    facultyScores: {
      concept: 10,
      planning: 10,
      result: 10,
      record: 10,
      viva: 10,
    },
    facultyRemarks: "Complete experiment.",
    scoredBy: faculty._id,
  })

  await upsertEntry({
    campusId: workshop.campusId,
    studentId: student._id,
    courseId: workshop._id,
    termId: term._id,
    recordType: "ACTION_LEARNING",
    taskTitle: "Village energy audit",
    criticalThinking: "Mapped loads and proposed two low-cost fixes.",
    hoursContributed: 8,
    booksManuals: "Workshop handbook",
    facultyScores: { criticalThinking: 40, presentationViva: 40 },
    facultyRemarks: "Strong fieldwork, viva a little rushed.",
    scoredBy: faculty._id,
  })

  await ClassroomComponents.updateOne(
    { studentId: student._id, courseId: combo._id, termId: term._id },
    {
      $set: {
        campusId: combo.campusId,
        studentId: student._id,
        courseId: combo._id,
        termId: term._id,
        assignment: 2,
        presentation: 2,
        midSem: 3,
        recordMark: 3,
        source: "MANUAL",
        updatedBy: faculty._id,
      },
    },
    { upsert: true }
  )

  await AiScoreRun.findOneAndUpdate(
    { entryId: appliedA._id, provider: "STUB" },
    {
      $set: {
        entryId: appliedA._id,
        campusId: combo.campusId,
        courseId: combo._id,
        studentId: student._id,
        provider: "STUB",
        status: "DONE",
        suggestedScores: {
          concept: 5,
          planning: 5,
          result: 5,
          record: 5,
          viva: 5,
        },
        rawOutput: "stub AI: midpoint marks, not a model chain-of-thought",
        override: {
          by: faculty._id,
          reason: "Work was stronger than the midpoint draft on every criterion.",
          at: new Date(),
          finalScores: appliedA.facultyScores,
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  )

  await recomputeSubjectScore(
    String(student._id),
    String(combo._id),
    "APPLIED_ACTION_LEARNING"
  )
  await recomputeSubjectScore(
    String(student._id),
    String(combo._id),
    "CLASSROOM_LEARNING"
  )
  await recomputeSubjectScore(
    String(student._id),
    String(workshop._id),
    "ACTION_LEARNING"
  )

  console.log(
    `seed-m04: Applied ${appliedA.experimentNo}+${appliedB.experimentNo} → 18/20, Workshop 24/30, Classroom 2+2+3+3=10`
  )
  process.exit(0)
}

async function upsertEntry(input: {
  campusId: Types.ObjectId
  studentId: Types.ObjectId
  courseId: Types.ObjectId
  termId: Types.ObjectId
  recordType: "APPLIED_ACTION_LEARNING" | "ACTION_LEARNING"
  experimentNo?: number
  title?: string
  concept?: string
  planning?: string
  result?: string
  recordNotes?: string
  vivaNotes?: string
  taskTitle?: string
  criticalThinking?: string
  hoursContributed?: number
  booksManuals: string
  facultyScores: Record<string, number>
  facultyRemarks: string
  scoredBy: Types.ObjectId
}) {
  const filter =
    input.recordType === "APPLIED_ACTION_LEARNING"
      ? {
          studentId: input.studentId,
          courseId: input.courseId,
          recordType: input.recordType,
          experimentNo: input.experimentNo,
        }
      : {
          studentId: input.studentId,
          courseId: input.courseId,
          recordType: input.recordType,
          taskTitle: input.taskTitle,
        }

  const entry = await LrEntry.findOneAndUpdate(
    filter,
    {
      $set: {
        campusId: input.campusId,
        studentId: input.studentId,
        courseId: input.courseId,
        termId: input.termId,
        recordType: input.recordType,
        status: "SUBMITTED",
        submittedAt: new Date(),
        experimentNo: input.experimentNo,
        title: input.title,
        concept: input.concept,
        planning: input.planning,
        result: input.result,
        recordNotes: input.recordNotes,
        vivaNotes: input.vivaNotes,
        taskTitle: input.taskTitle,
        criticalThinking: input.criticalThinking,
        hoursContributed: input.hoursContributed,
        booksManuals: input.booksManuals,
        facultyScores: input.facultyScores,
        facultyRemarks: input.facultyRemarks,
        scoredBy: input.scoredBy,
        scoredAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" }
  )
  return entry
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
