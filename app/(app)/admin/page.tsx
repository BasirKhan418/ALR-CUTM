import { CircleDotIcon, UserPlusIcon, UsersIcon } from "lucide-react"
import { CreateUserForm } from "@/components/create-user-form"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { Campus } from "@/lib/db/models/campus"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import {
  formatWhen,
  loginMethodLabel,
  roleLabel,
} from "@/lib/ui/format"

export default async function AdminPage() {
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
  const activeCount = users.filter((user) => user.active).length
  const neverSignedIn = users.filter((user) => !user.lastLoginAt).length

  return (
    <PageEnter className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Administration
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          People
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Provision campus users. They sign in with email OTP or Google — no
          passwords.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={UsersIcon}
          label="Provisioned"
          value={String(users.length)}
        />
        <StatTile
          icon={CircleDotIcon}
          label="Active"
          value={String(activeCount)}
        />
        <StatTile
          icon={UserPlusIcon}
          label="Never signed in"
          value={String(neverSignedIn)}
        />
      </div>

      <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-heading text-base font-medium">Users</h2>
          <span className="text-xs text-muted-foreground">
            {users.length} {users.length === 1 ? "record" : "records"}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Person</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4">Last sign-in</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-muted-foreground"
                >
                  No users yet. Create one below.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={String(user._id)} className="transition-colors">
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-64 flex-wrap gap-1">
                      {user.roles.map((role: string) => (
                        <Badge key={role} variant="outline">
                          {roleLabel(role)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {campusName.get(String(user.campusId)) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span
                        className={
                          user.active
                            ? "size-1.5 rounded-full bg-primary"
                            : "size-1.5 rounded-full bg-muted-foreground/40"
                        }
                      />
                      {user.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4 text-muted-foreground">
                    {user.lastLoginAt
                      ? `${loginMethodLabel(user.lastLoginMethod)} · ${formatWhen(user.lastLoginAt)}`
                      : "Never"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <div className="mb-5 flex flex-col gap-1">
          <h2 className="font-heading text-base font-medium">Create user</h2>
          <p className="text-sm text-muted-foreground">
            Name, campus email, and at least one role. They get no temporary
            password.
          </p>
        </div>
        <CreateUserForm
          campuses={campuses.map((campus) => ({
            id: String(campus._id),
            name: campus.name,
          }))}
        />
      </section>
    </PageEnter>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-heading text-2xl font-medium tracking-tight">
        {value}
      </p>
    </div>
  )
}
