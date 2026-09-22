import { AnalyticsScreen } from "@/components/analytics-screen"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { Suspense } from "react"

export default function HodAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string
    department?: string
    term?: string
    programme?: string
  }>
}) {
  return (
    <Suspense fallback={<WorkspaceSkeleton />}>
      <AnalyticsScreen
        audience="HOD"
        pathname="/hod/analytics"
        searchParams={searchParams}
      />
    </Suspense>
  )
}
