import Link from "next/link"
import { BrandMark } from "@/components/brand-mark"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <BrandMark />
          <span className="text-sm text-muted-foreground">CUTM</span>
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-primary text-primary-foreground lg:block">
        <div className="absolute inset-0 flex flex-col justify-end gap-3 p-10">
          <p className="text-sm font-medium text-primary-foreground/75">
            Centurion University of Technology and Management
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            ALR — Learning Record
          </h2>
          <p className="max-w-md text-primary-foreground/75">
            Twelve subject configurations, committee evaluation, and compulsory
            ALR credit.
          </p>
        </div>
      </div>
    </div>
  )
}
