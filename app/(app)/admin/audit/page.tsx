import { connection } from "next/server"
import { Suspense } from "react"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { buttonVariants } from "@/components/ui/button"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { listAuditRows } from "@/lib/audit/queries"
import { firstShellHref } from "@/lib/domain/roles"
import { cn } from "@/lib/utils"

const selectClass =
  "h-8 w-full min-w-36 appearance-none rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export default function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; action?: string; from?: string; to?: string }>
}) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader searchParams={searchParams} />
    </Suspense>
  )
}

async function Loader({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; action?: string; from?: string; to?: string }>
}) {
  await connection()
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  const query = await searchParams
  const rows = await listAuditRows(query)
  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Audit"
        description="Actor, action, and time. File contents stay out of this table."
      />
      <form className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm">
          Actor
          <input
            name="actor"
            defaultValue={query.actor ?? ""}
            placeholder="Name or email"
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Action
          <input
            name="action"
            defaultValue={query.action ?? ""}
            placeholder="year.sign"
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          From
          <input name="from" type="date" defaultValue={query.from ?? ""} className={selectClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          To
          <input name="to" type="date" defaultValue={query.to ?? ""} className={selectClass} />
        </label>
        <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "h-8 self-end")}>
          Filter
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">At</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={3}>
                  No audit rows match this filter.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-foreground/10">
                  <td className="px-3 py-2">
                    <span className="font-medium">{row.actor}</span>
                    {row.actorEmail ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{row.actorEmail}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{row.action}</td>
                  <td className="px-3 py-2">{row.at.replace("T", " ").slice(0, 19)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageEnter>
  )
}
