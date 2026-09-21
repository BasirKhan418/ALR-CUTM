import { Suspense } from "react"
import { AdminPeople, type AdminPerson } from "@/components/admin-people"
import { AdminSkeleton } from "@/components/app-shell-skeleton"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { Campus } from "@/lib/db/models/campus"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminPeopleLoader />
    </Suspense>
  )
}

async function AdminPeopleLoader() {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }

  await connectMongo()
  const [users, campuses] = await Promise.all([
    User.find().sort({ name: 1 }).lean(),
    Campus.find().sort({ name: 1 }).lean(),
  ])
  const campusName = new Map(
    campuses.map((campus) => [String(campus._id), campus.name])
  )

  const people: AdminPerson[] = users.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    roles: user.roles,
    campusName: campusName.get(String(user.campusId)) ?? "—",
    active: user.active,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    lastLoginMethod: user.lastLoginMethod ?? null,
  }))

  return (
    <PageEnter>
      <AdminPeople
        people={people}
        currentUserId={session.userId}
        campuses={campuses.map((campus) => ({
          id: String(campus._id),
          name: campus.name,
        }))}
      />
    </PageEnter>
  )
}
