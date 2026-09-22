import { createHash } from "crypto"
import { Types } from "mongoose"
import { Course } from "@/lib/db/models/course"
import { CreditLedger } from "@/lib/db/models/credit-ledger"
import { Enrollment } from "@/lib/db/models/enrollment"
import { LrEntry } from "@/lib/db/models/lr-entry"
import { MajorDeliverable } from "@/lib/db/models/major-deliverable"
import { PlagiarismCase } from "@/lib/db/models/plagiarism-case"
import { Programme } from "@/lib/db/models/programme"
import { SubjectScore } from "@/lib/db/models/subject-score"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import type { AnalyticsScope } from "@/lib/domain/analytics"
import { recordTypeLabel, RECORD_TYPES } from "@/lib/domain/record-types"
import { CREDIT_SOURCE } from "@/lib/domain/tiers"
import { getValkey } from "@/lib/valkey"

const OVERDUE_MS = 7 * 24 * 60 * 60 * 1000
const OPEN_CASES = ["OPEN", "STUDENT_RESPONDED", "COMMITTEE_RECOMMENDED"]
const WAITING_SIGNOFF = ["SUBMITTED", "SUBMITTED_FOR_EVALUATION"]

export type AnalyticsSnapshot = {
  submissions: { recordType: string; label: string; count: number }[]
  averageNormalized: number | null
  overdueSignoffs: number
  openCases: number
  creditsPosted: number
  creditsExpected: number
  workshopHours: number
}

const EMPTY: AnalyticsSnapshot = {
  submissions: RECORD_TYPES.map((recordType) => ({
    recordType,
    label: recordTypeLabel(recordType),
    count: 0,
  })),
  averageNormalized: null,
  overdueSignoffs: 0,
  openCases: 0,
  creditsPosted: 0,
  creditsExpected: 0,
  workshopHours: 0,
}

async function matchingCourseIds(scope: AnalyticsScope): Promise<string[] | null> {
  const filter: Record<string, unknown> = {}
  if (scope.campusId) filter.campusId = scope.campusId
  if (scope.departmentId) filter.departmentId = scope.departmentId
  if (scope.termId) filter.termId = scope.termId
  if (scope.programmeId) filter.programmeId = scope.programmeId
  if (Object.keys(filter).length === 0) return null
  const rows = await Course.find(filter).select("_id").lean()
  return rows.map((row) => String(row._id))
}

function cacheKey(scope: AnalyticsScope) {
  return `analytics:v2:${createHash("sha256").update(JSON.stringify(scope)).digest("hex")}`
}

export async function loadAnalytics(scope: AnalyticsScope): Promise<AnalyticsSnapshot> {
  const key = cacheKey(scope)
  try {
    const hit = await getValkey().get(key)
    if (hit) return JSON.parse(hit) as AnalyticsSnapshot
  } catch {
    // Compute when the short cache is unavailable.
  }
  const snapshot = await computeAnalytics(scope)
  try {
    await getValkey().set(key, JSON.stringify(snapshot), "EX", 60)
  } catch {
    // The page still renders the fresh snapshot.
  }
  return snapshot
}

async function computeAnalytics(scope: AnalyticsScope): Promise<AnalyticsSnapshot> {
  await connectMongo()
  if (scope.requireDepartment) return EMPTY
  if (!scope.campusId && !scope.allCampuses) return EMPTY
  const courseIds = await matchingCourseIds(scope)
  if (courseIds && courseIds.length === 0) return EMPTY

  const courseObjectIds = courseIds?.map((id) => new Types.ObjectId(id))
  const courseMatch = courseObjectIds ? { courseId: { $in: courseObjectIds } } : {}
  const campusMatch = scope.campusId ? { campusId: scope.campusId } : {}
  const cutoff = new Date(Date.now() - OVERDUE_MS)

  const studentFilter: Record<string, unknown> = {
    roles: "STUDENT",
    active: true,
    ...campusMatch,
  }
  if (scope.departmentId) studentFilter.departmentId = scope.departmentId
  if (scope.programmeId) studentFilter.programmeId = scope.programmeId
  if (courseIds) {
    const enrolled = await Enrollment.find({ courseId: { $in: courseIds } })
      .select("studentId")
      .lean()
    studentFilter._id = { $in: enrolled.map((row) => row.studentId) }
  }
  const students = await User.find(studentFilter).select("_id programmeId").lean()
  const studentIds = students.map((student) => student._id)

  const [submissionRows, scoreRows, overdueDeliverables, openCases, overdueCases, ledger, programmes, workshop] =
    await Promise.all([
      LrEntry.aggregate<{ _id: string; count: number }>([
        { $match: { status: "SUBMITTED", ...courseMatch } },
        { $group: { _id: "$recordType", count: { $sum: 1 } } },
      ]),
      SubjectScore.aggregate<{ average: number }>([
        { $match: courseMatch },
        { $group: { _id: null, average: { $avg: "$normalized" } } },
      ]),
      MajorDeliverable.countDocuments({
        ...courseMatch,
        status: { $in: WAITING_SIGNOFF },
        updatedAt: { $lt: cutoff },
      }),
      PlagiarismCase.countDocuments({
        ...campusMatch,
        ...(courseObjectIds ? { courseId: { $in: courseObjectIds } } : {}),
        status: { $in: OPEN_CASES },
      }),
      PlagiarismCase.countDocuments({
        ...campusMatch,
        ...(courseObjectIds ? { courseId: { $in: courseObjectIds } } : {}),
        status: { $in: OPEN_CASES },
        responseDueAt: { $lt: new Date() },
      }),
      CreditLedger.find({
        studentId: { $in: studentIds },
        source: CREDIT_SOURCE,
      })
        .select("credits")
        .lean(),
      Programme.find({
        _id: { $in: students.map((student) => student.programmeId).filter(Boolean) },
      })
        .select("durationYears")
        .lean(),
      LrEntry.aggregate<{ hours: number }>([
        {
          $match: {
            status: "SUBMITTED",
            recordType: "ACTION_LEARNING",
            ...courseMatch,
          },
        },
        { $group: { _id: null, hours: { $sum: "$hoursContributed" } } },
      ]),
    ])

  const countByType = new Map(submissionRows.map((row) => [row._id, row.count]))
  const durationById = new Map(
    programmes.map((row) => [String(row._id), row.durationYears])
  )
  const average = scoreRows[0]?.average

  return {
    submissions: RECORD_TYPES.map((recordType) => ({
      recordType,
      label: recordTypeLabel(recordType),
      count: countByType.get(recordType) ?? 0,
    })),
    averageNormalized:
      typeof average === "number" ? Math.round(average * 100) / 100 : null,
    overdueSignoffs: overdueDeliverables + overdueCases,
    openCases,
    creditsPosted: ledger.reduce((sum, row) => sum + row.credits, 0),
    creditsExpected: students.reduce(
      (sum, student) => sum + (durationById.get(String(student.programmeId)) ?? 0),
      0
    ),
    workshopHours: Math.round((workshop[0]?.hours ?? 0) * 100) / 100,
  }
}
