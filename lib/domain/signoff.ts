import type { Role } from "@/lib/domain/roles"

export const SIGNOFF_DECISIONS = [
  "PENDING",
  "APPROVED",
  "RETURNED",
  "REJECTED",
] as const

export type SignoffDecision = (typeof SIGNOFF_DECISIONS)[number]

export const SIGNOFF_TARGET_TYPES = [
  "MAJOR_DELIVERABLE",
  "PAPER_PUBLICATION",
  "YEAR_EVALUATION",
  "PROGRAM_EVALUATION",
] as const

export type SignoffTargetType = (typeof SIGNOFF_TARGET_TYPES)[number]

export type SignoffStepDef = {
  stepOrder: number
  role: Role
}

export function buildDeliverableChain(input: {
  hasCoSupervisor: boolean
  hasHod: boolean
}): SignoffStepDef[] {
  const steps: SignoffStepDef[] = [
    { stepOrder: 1, role: "STUDENT" },
    { stepOrder: 2, role: "SUPERVISOR" },
  ]
  if (input.hasCoSupervisor) {
    steps.push({ stepOrder: 3, role: "CO_SUPERVISOR" })
  }
  steps.push({
    stepOrder: steps.length + 1,
    role: input.hasHod ? "HOD" : "DEAN",
  })
  return steps
}

export function buildPublicationChain(input: {
  hasCoSupervisor: boolean
  hasHod: boolean
}): SignoffStepDef[] {
  const steps: SignoffStepDef[] = [
    { stepOrder: 1, role: "STUDENT" },
    { stepOrder: 2, role: "SUPERVISOR" },
  ]
  if (input.hasCoSupervisor) {
    steps.push({ stepOrder: 3, role: "CO_SUPERVISOR" })
  }
  steps.push({
    stepOrder: steps.length + 1,
    role: input.hasHod ? "HOD" : "DEAN",
  })
  return steps
}

export function signoffRoleLabel(role: Role) {
  if (role === "CO_SUPERVISOR") return "Co-supervisor"
  if (role === "HOD") return "HoD"
  if (role === "DEAN") return "Dean"
  if (role === "SUPERVISOR") return "Supervisor"
  if (role === "STUDENT") return "Student"
  return role
}

export function decisionLabel(decision: SignoffDecision) {
  if (decision === "PENDING") return "Waiting"
  if (decision === "APPROVED") return "Approved"
  if (decision === "RETURNED") return "Returned"
  return "Rejected"
}

export function sessionOwnsSignoffRole(
  session: {
    userId: string
    roles: readonly string[]
    campusId?: string
    departmentId: string | null
  },
  deliverable: {
    supervisorId: string
    coSupervisorId: string
    departmentId: string
    campusId?: string
  },
  role: Role | undefined | null
) {
  if (!role) return false
  if (role === "SUPERVISOR") return deliverable.supervisorId === session.userId
  if (role === "CO_SUPERVISOR") return deliverable.coSupervisorId === session.userId
  if (role === "HOD") {
    return session.roles.includes("HOD") && session.departmentId === deliverable.departmentId
  }
  if (role === "DEAN") {
    return (
      session.roles.includes("DEAN") &&
      (!deliverable.campusId || !session.campusId || session.campusId === deliverable.campusId)
    )
  }
  return false
}

export function canAccessDeliverable(
  session: {
    userId: string
    roles: readonly string[]
    campusId: string
    departmentId: string | null
  },
  deliverable: {
    campusId: string
    departmentId: string
    supervisorId: string
    coSupervisorId: string
    candidateIds?: string[]
    candidates?: { id: string }[]
  },
  assignedFaculty: boolean
) {
  const candidateIds =
    deliverable.candidateIds ??
    deliverable.candidates?.map((item) => item.id) ??
    []
  if (candidateIds.includes(session.userId)) return true
  if (deliverable.supervisorId === session.userId) return true
  if (deliverable.coSupervisorId === session.userId) return true
  if (assignedFaculty) return true
  if (session.roles.includes("HOD") && session.departmentId === deliverable.departmentId) {
    return true
  }
  if (session.roles.includes("DEAN") && session.campusId === deliverable.campusId) {
    return true
  }
  if (session.roles.includes("ADMIN")) return true
  return false
}
