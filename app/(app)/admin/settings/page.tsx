import { AdminCatalogNav } from "@/components/admin-catalog-nav"
import { ClassroomWeightsForm } from "@/components/classroom-weights-form"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { TermForm } from "@/components/term-form"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { readClassroomComposites } from "@/lib/catalog/settings"
import { Term } from "@/lib/db/models/term"
import { connectMongo } from "@/lib/db/mongo"
import { firstShellHref } from "@/lib/domain/roles"
import { Suspense } from "react"

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <Loader />
    </Suspense>
  )
}

async function Loader() {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN")) {
    return <Forbidden homeHref={firstShellHref(session.roles)} />
  }
  await connectMongo()
  const [defaults, terms] = await Promise.all([
    readClassroomComposites(),
    Term.find().sort({ startsAt: -1 }).lean(),
  ])

  return (
    <PageEnter className="flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Administration</p>
        <h1 className="font-heading text-3xl font-semibold">Catalog settings</h1>
        <p className="text-sm text-muted-foreground">
          Terms are required before course setup. Classroom composites must sum
          to 10 and become the default Theory / MOOC split.
        </p>
        <AdminCatalogNav current="/admin/settings" />
      </div>
      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div>
          <h2 className="font-heading text-lg font-semibold">Terms</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Course codes are unique inside a term.
          </p>
        </div>
        <TermForm
          terms={terms.map((term) => ({
            id: String(term._id),
            name: term.name,
            academicYear: term.academicYear,
          }))}
        />
      </section>
      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Classroom composites
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Assignment, presentation, mid-sem, and record must sum to 10.
          </p>
        </div>
        <ClassroomWeightsForm defaults={defaults} />
      </section>
    </PageEnter>
  )
}
