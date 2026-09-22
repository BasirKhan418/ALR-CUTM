import { ArchivalPolicyForm } from "@/components/archival-policy-form"
import { ClassroomWeightsForm } from "@/components/classroom-weights-form"
import { PlagiarismSettingsForm } from "@/components/plagiarism-settings-form"
import { TierSettingsForm } from "@/components/tier-forms"
import { Forbidden } from "@/components/forbidden"
import { PageEnter } from "@/components/page-enter"
import { PageHeader } from "@/components/page-header"
import { TermForm } from "@/components/term-form"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { hasRole, requireSession } from "@/lib/auth/guards"
import {
  readArchivalPolicy,
  readClassroomComposites,
  readPlagiarismHourlyCap,
  readPlagiarismThresholds,
  readPlagiarismWarnPercent,
} from "@/lib/catalog/settings"
import { readTierSettings } from "@/lib/tiers/settings"
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
  const [defaults, terms, thresholds, hourlyCap, warnPercent, archivalPolicy, tierSettings] =
    await Promise.all([
      readClassroomComposites(),
      Term.find().sort({ startsAt: -1 }).lean(),
      readPlagiarismThresholds(),
      readPlagiarismHourlyCap(),
      readPlagiarismWarnPercent(),
      readArchivalPolicy(),
      readTierSettings(),
    ])

  return (
    <PageEnter className="flex w-full flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Terms are required before course setup. Classroom composites must sum to 10 and become the default Theory / MOOC split."
      />
      <div className="grid gap-6 xl:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
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
      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
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
      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5 xl:col-span-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Integrity thresholds
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thesis defaults to 20. Programming uses the code-similarity engine.
          </p>
        </div>
        <PlagiarismSettingsForm
          thresholds={thresholds}
          hourlyCap={hourlyCap}
          warnPercent={warnPercent}
        />
      </section>
      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5 xl:col-span-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Year and programme rubric
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Five criteria, 20 marks each. Programme cumulation is the equal-weight mean of year totals, scaled by the setting below.
          </p>
        </div>
        <TierSettingsForm settings={tierSettings} />
      </section>
      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5 xl:col-span-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">Archival policy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The next booklet PDF and the student exports page quote this sentence.
          </p>
        </div>
        <ArchivalPolicyForm policy={archivalPolicy} />
      </section>
      </div>
    </PageEnter>
  )
}
