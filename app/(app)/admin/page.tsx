import Link from "next/link"
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
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
    <PageEnter className="flex w-full flex-col gap-4">
      <nav className="flex flex-wrap gap-2">
        {[
          ["/admin/health", "Health"],
          ["/admin/analytics", "Analytics"],
          ["/admin/audit", "Audit"],
          ["/admin/exports", "Exam cell"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {label}
          </Link>
        ))}
      </nav>
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
