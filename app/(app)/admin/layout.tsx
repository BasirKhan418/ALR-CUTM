import { connection } from "next/server"
import { Suspense } from "react"
import { hasRole, getSession } from "@/lib/auth/guards"
import { plagiarismUsage } from "@/lib/plagiarism/rate-limit"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <HeadroomBanner />
      </Suspense>
      {children}
    </>
  )
}

async function HeadroomBanner() {
  await connection()
  const session = await getSession()
  if (!session || !hasRole(session, "ADMIN")) return null
  let usage: { used: number; cap: number; percent: number }
  try {
    usage = await plagiarismUsage(session.campusId)
  } catch {
    return null
  }
  if (usage.percent < 90) return null
  return (
    <p className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
      Plagiarism usage is {usage.used} / {usage.cap} ({usage.percent}%). New scans wait
      twice as long until the hour drops below 90%.
    </p>
  )
}
