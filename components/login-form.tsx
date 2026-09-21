"use client"

import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-heading text-2xl font-semibold">Sign in to ALR</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Email + OTP or Sign in with Google. No passwords.
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="name@cutm.ac.in"
            autoComplete="email"
            disabled
          />
          <FieldDescription>OTP sign-in is wired in M01.</FieldDescription>
        </Field>
        <Field>
          <Button type="button" className="w-full" disabled>
            Send OTP
          </Button>
        </Field>
        <FieldSeparator>or</FieldSeparator>
        <Field>
          <Button type="button" variant="outline" className="w-full" disabled>
            Sign in with Google
          </Button>
          <FieldDescription>Google OAuth is wired in M01.</FieldDescription>
        </Field>
        <Field>
          <Link
            href="/student"
            className={cn(buttonVariants({ variant: "secondary" }), "w-full")}
          >
            Preview student shell
          </Link>
        </Field>
      </FieldGroup>
    </div>
  )
}
