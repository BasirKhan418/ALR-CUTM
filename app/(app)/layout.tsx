import type { ReactNode } from "react"
import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AppShellSkeleton } from "@/components/app-shell-skeleton"
import { DeclarationForm } from "@/components/declaration-form"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { requireSession } from "@/lib/auth/guards"
import { firstShellHref, shellRolesFor } from "@/lib/domain/roles"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  )
}

async function AppShell({ children }: { children: ReactNode }) {
  const session = await requireSession()

  if (!session.declarationAcceptedAt) {
    return <DeclarationForm />
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        roles={shellRolesFor(session.roles)}
        name={session.name}
        email={session.email}
        campusName={session.campusName}
        homeHref={firstShellHref(session.roles)}
      />
      <SidebarInset>
        <SiteHeader
          name={session.name}
          email={session.email}
          campusName={session.campusName}
        />
        <div className="flex flex-1 flex-col p-6 md:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
