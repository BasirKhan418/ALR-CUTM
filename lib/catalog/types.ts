import type { CourseRecordConfig } from "@/lib/domain/catalog"
import type { CombinationCode } from "@/lib/domain/subject-map"

export type ManageCourse = {
  id: string
  code: string
  title: string
  termName: string
  academicYear: string
  departmentName: string
  programmeName: string
  combinationCode: CombinationCode
  deliveryMode: string
  recordConfigs: CourseRecordConfig[]
}
