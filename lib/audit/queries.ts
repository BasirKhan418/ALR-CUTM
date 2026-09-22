import { AuditLog } from "@/lib/db/models/audit-log"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"

export type AuditRow = {
  id: string
  actor: string
  actorEmail: string
  action: string
  at: string
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export async function listAuditRows(filter: {
  actor?: string
  action?: string
  from?: string
  to?: string
}): Promise<AuditRow[]> {
  await connectMongo()
  const query: Record<string, unknown> = {}
  const actor = filter.actor?.trim()
  if (actor) {
    const pattern = new RegExp(escapeRegex(actor), "i")
    const people = await User.find({ $or: [{ email: pattern }, { name: pattern }] })
      .select("_id")
      .limit(40)
      .lean()
    query.actorId = { $in: people.map((person) => person._id) }
  }
  const action = filter.action?.trim()
  if (action) query.action = new RegExp(escapeRegex(action), "i")
  const createdAt: { $gte?: Date; $lte?: Date } = {}
  if (filter.from) {
    const from = new Date(filter.from)
    if (!Number.isNaN(from.getTime())) createdAt.$gte = from
  }
  if (filter.to) {
    const to = new Date(`${filter.to}T23:59:59.999Z`)
    if (!Number.isNaN(to.getTime())) createdAt.$lte = to
  }
  if (createdAt.$gte || createdAt.$lte) query.createdAt = createdAt

  const rows = await AuditLog.find(query).sort({ createdAt: -1 }).limit(100).lean()
  const actorIds = [
    ...new Set(rows.map((row) => (row.actorId ? String(row.actorId) : "")).filter(Boolean)),
  ]
  const people = await User.find({ _id: { $in: actorIds } }).select("name email").lean()
  const byId = new Map(people.map((person) => [String(person._id), person]))

  return rows.map((row) => {
    const person = row.actorId ? byId.get(String(row.actorId)) : undefined
    return {
      id: String(row._id),
      actor: person?.name ?? "System",
      actorEmail: person?.email ?? "",
      action: row.action,
      at: row.createdAt.toISOString(),
    }
  })
}
