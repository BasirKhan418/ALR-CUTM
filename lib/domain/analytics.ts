export type AnalyticsAudience = "ADMIN" | "DEAN" | "HOD"

export type AnalyticsScope = {
  campusId?: string
  departmentId?: string
  termId?: string
  programmeId?: string
  allCampuses: boolean
  requireDepartment: boolean
}

const OBJECT_ID = /^[a-f0-9]{24}$/i

function validId(value: string | undefined): string | undefined {
  if (!value || !OBJECT_ID.test(value)) return undefined
  return value
}

/**
 * Missing or unknown campus stays on the signed-in campus.
 * "all" is an explicit Admin/Dean choice. HoD cannot leave their campus or department.
 */
export function clampAnalyticsScope(input: {
  audience: AnalyticsAudience
  sessionCampusId: string
  sessionDepartmentId: string | null
  campusId?: string
  departmentId?: string
  termId?: string
  programmeId?: string
}): AnalyticsScope {
  const allCampuses =
    input.campusId === "all" &&
    (input.audience === "ADMIN" || input.audience === "DEAN")
  const campusId =
    input.audience === "HOD"
      ? input.sessionCampusId
      : allCampuses
        ? undefined
        : (validId(input.campusId) ?? input.sessionCampusId)
  const departmentId =
    input.audience === "HOD"
      ? (input.sessionDepartmentId ?? undefined)
      : validId(input.departmentId)

  return {
    campusId,
    departmentId,
    termId: validId(input.termId),
    programmeId: validId(input.programmeId),
    allCampuses,
    requireDepartment: input.audience === "HOD" && !input.sessionDepartmentId,
  }
}
