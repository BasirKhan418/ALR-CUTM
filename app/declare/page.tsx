import { Suspense } from "react"
import { redirect } from "next/navigation"
import { DeclarationForm } from "@/components/declaration-form"
import { requireSession } from "@/lib/auth/guards"
import { firstShellHref } from "@/lib/domain/roles"

export default function DeclarePage() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-background" />}>
      <DeclareGate />
    </Suspense>
  )
}

async function DeclareGate() {
  const session = await requireSession()
  if (session.declarationAcceptedAt) {
    redirect(firstShellHref(session.roles))
  }
  return <DeclarationForm />
}
