import { cacheLife, cacheTag } from "next/cache"
import { Course } from "@/lib/db/models/course"
import { Department } from "@/lib/db/models/department"
import { Programme } from "@/lib/db/models/programme"
import { Term } from "@/lib/db/models/term"
import { connectMongo } from "@/lib/db/mongo"
import type { CourseRecordConfig } from "@/lib/domain/catalog"
import type { CombinationCode } from "@/lib/domain/subject-map"

export type CatalogCourse = {
  id: string
  campusId: string
  departmentId: string
  programmeId: string
  code: string
  title: string
  termId: string
  termName: string
  academicYear: string
  departmentName: string
  programmeName: string
  combinationCode: CombinationCode
  deliveryMode: string
  recordConfigs: CourseRecordConfig[]
}

export async function cachedCampusCatalog(
  campusId: string
): Promise<CatalogCourse[]> {
  "use cache"
  cacheTag("catalog", campusId)
  cacheLife("minutes")
  return loadCampusCatalog(campusId)
}

export async function loadCampusCatalog(
  campusId: string
): Promise<CatalogCourse[]> {
  await connectMongo()
  const courses = await Course.find({ campusId }).sort({ code: 1 }).lean()
  const [terms, departments, programmes] = await Promise.all([
    Term.find({ _id: { $in: courses.map((course) => course.termId) } }).lean(),
    Department.find({
      _id: { $in: courses.map((course) => course.departmentId) },
    }).lean(),
    Programme.find({
      _id: { $in: courses.map((course) => course.programmeId) },
    }).lean(),
  ])
  const termById = new Map(terms.map((term) => [String(term._id), term]))
  const deptById = new Map(
    departments.map((department) => [String(department._id), department])
  )
  const programmeById = new Map(
    programmes.map((programme) => [String(programme._id), programme])
  )

  return courses.map((course) => {
    const term = termById.get(String(course.termId))
    const department = deptById.get(String(course.departmentId))
    const programme = programmeById.get(String(course.programmeId))
    return {
      id: String(course._id),
      campusId: String(course.campusId),
      departmentId: String(course.departmentId),
      programmeId: String(course.programmeId),
      code: course.code,
      title: course.title,
      termId: String(course.termId),
      termName: term?.name ?? "Term",
      academicYear: term?.academicYear ?? "",
      departmentName: department?.name ?? "Department",
      programmeName: programme?.name ?? "Programme",
      combinationCode: course.combinationCode,
      deliveryMode: course.deliveryMode,
      recordConfigs: course.recordConfigs,
    }
  })
}
