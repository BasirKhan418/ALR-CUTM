import { AnalyticsScreen } from "@/components/analytics-screen"
import { WorkspaceSkeleton } from "@/components/app-shell-skeleton"
import { Suspense } from "react"

export default function AdminAnalyticsPage({
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
        audience="ADMIN"
        pathname="/admin/analytics"
        searchParams={searchParams}
      />
    </Suspense>
  )
}
