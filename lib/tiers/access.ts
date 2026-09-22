import { hasRole, type AppSession } from "@/lib/auth/guards"
import { yearIsClosed } from "@/lib/domain/tiers"
import type { TierSettings } from "@/lib/tiers/settings"
import type { ProgramDetail, YearDetail, YearFlags, ProgramFlags } from "@/lib/tiers/types"

export function campusAllowed(session: AppSession, campusId: string) {
  if (hasRole(session, "ADMIN", "EXAM_CELL")) return true
  return session.campusId === campusId
}

export function assessYear(
  session: AppSession,
  detail: YearDetail,
  settings: TierSettings
): YearFlags {
  const dean = hasRole(session, "DEAN") && session.campusId === detail.campusId
  const admin = hasRole(session, "ADMIN")
  const onCommittee =
    hasRole(session, "COMMITTEE_MEMBER") &&
    detail.committeeIds.includes(session.userId)
  const rubricOn = settings.yearWiseUsesFiveCriterion
  const openForScore =
    detail.status === "COMMITTEE_ASSIGNED" || detail.status === "SCORED"
  const canSignStatus = rubricOn
    ? detail.status === "SCORED"
    : detail.status === "COMMITTEE_ASSIGNED" || detail.status === "SCORED"

  return {
    canScore: (dean || admin || onCommittee) && rubricOn && openForScore,
    canSign:
      (dean || admin || onCommittee) &&
      canSignStatus &&
      (!rubricOn || detail.rubricTotal !== null),
    canExport:
      (dean || admin) && yearIsClosed(detail.status) && detail.creditPosted,
    canPostCredit:
      (dean || admin) && detail.status === "SIGNED" && !detail.creditPosted,
    canSignPo:
      hasRole(session, "MENTOR") &&
      detail.mentorUserIds.includes(session.userId) &&
      !detail.mentorSigned &&
      detail.status !== "DRAFT",
    canEditCommittee:
      (dean || admin) &&
      (detail.status === "DRAFT" ||
        detail.status === "COMMITTEE_ASSIGNED" ||
        detail.status === "SCORED"),
    coCourseIds: hasRole(session, "FACULTY")
      ? detail.courses
          .filter(
            (course) =>
              !course.coSigned && course.facultyIds.includes(session.userId)
          )
          .map((course) => course.id)
      : [],
  }
}

export function assessProgram(
  session: AppSession,
  detail: ProgramDetail,
  settings: TierSettings
): ProgramFlags {
  const dean = hasRole(session, "DEAN") && session.campusId === detail.campusId
  const admin = hasRole(session, "ADMIN")
  const onCommittee =
    hasRole(session, "COMMITTEE_MEMBER") &&
    detail.committeeIds.includes(session.userId)
  const rubricOn = settings.programWiseUsesFiveCriterion
  const open = detail.status === "COMMITTEE_ASSIGNED" || detail.status === "SCORED"
  const scoredEnough = rubricOn
    ? detail.rubricTotal !== null
    : detail.cumulatedMark !== null

  return {
    canCumulate: (dean || admin) && open,
    canScore: (dean || admin || onCommittee) && rubricOn && open,
    canSign: (dean || admin || onCommittee) && detail.status === "SCORED" && scoredEnough,
    canExport: (dean || admin) && yearIsClosed(detail.status),
    canEditCommittee: (dean || admin) && !yearIsClosed(detail.status),
  }
}
