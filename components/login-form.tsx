"use client"

import { useActionState, useState } from "react"
import { ArrowRightIcon, CircleAlertIcon, MailIcon } from "lucide-react"
import { requestOtp, verifyOtp, type AuthFormState } from "@/lib/actions/auth"
import { GoogleMark } from "@/components/google-mark"
import { OtpField } from "@/components/otp-field"
import { SubmitButton } from "@/components/submit-button"
import { Spinner } from "@/components/ui/spinner"
import { buttonVariants } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const LOGIN_ERRORS: Record<string, string> = {
  not_provisioned:
    "This Google account is not provisioned. Ask your Admin.",
  domain:
    "Use a @cutm.ac.in or @cutm.edu.in email. Gmail is not accepted except the designated admin.",
  google_not_configured: "Google sign-in is not configured.",
  google_denied: "Google sign-in was cancelled or failed.",
}

const INITIAL: AuthFormState = { ok: false }

export function LoginForm({
  className,
  googleConfigured,
  error,
  ...props
}: React.ComponentProps<"div"> & {
  googleConfigured: boolean
  error?: string
}) {
  const [forceEmail, setForceEmail] = useState(false)
  const [googlePending, setGooglePending] = useState(false)
  const [requestState, requestAction] = useActionState(requestOtp, INITIAL)
  const [verifyState, verifyAction, verifying] = useActionState(
    verifyOtp,
    INITIAL
  )
  const email = verifyState.email || requestState.email || ""
  const step =
    !forceEmail &&
    (requestState.step === "otp" || verifyState.step === "otp")
      ? "otp"
      : "email"
  const banner = error ? LOGIN_ERRORS[error] : undefined
  const requestError = requestState.ok ? undefined : requestState.message
  const verifyError = verifyState.ok ? undefined : verifyState.message

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Campus sign-in
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {step === "otp" ? "Enter the code" : "Sign in to ALR"}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {step === "otp"
              ? `A 6-digit code was sent to ${email}. It expires in 10 minutes.`
              : "Use your CUTM email. We send a one-time code — there is no password."}
          </p>
        </div>

        {banner ? (
          <div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-sm text-destructive animate-enter">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <p>{banner}</p>
          </div>
        ) : null}

        {step === "otp" ? (
          <form
            key={email}
            action={verifyAction}
            className="flex flex-col gap-5 animate-enter"
          >
            <input type="hidden" name="email" value={email} />
            <Field>
              <FieldLabel htmlFor="code">One-time code</FieldLabel>
              <OtpField disabled={verifying} />
              {verifyError ? (
                <FieldError className="flex items-center gap-1.5">
                  <CircleAlertIcon className="size-3.5" />
                  {verifyError}
                </FieldError>
              ) : null}
              {requestState.ok && requestState.message ? (
                <FieldDescription>{requestState.message}</FieldDescription>
              ) : null}
            </Field>
            <Field>
              <SubmitButton
                size="lg"
                className="h-10 w-full"
                pendingLabel="Verifying…"
              >
                Verify and sign in
              </SubmitButton>
              <button
                type="button"
                onClick={() => setForceEmail(true)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Use a different email
              </button>
            </Field>
          </form>
        ) : (
          <form
            action={requestAction}
            onSubmit={() => setForceEmail(false)}
            className="flex flex-col gap-5 animate-enter"
          >
            <Field>
              <FieldLabel htmlFor="email">Campus email</FieldLabel>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@cutm.ac.in"
                  autoComplete="email"
                  defaultValue={email}
                  required
                  className="h-10 pl-9"
                />
              </div>
              <FieldDescription>
                @cutm.ac.in or @cutm.edu.in.
              </FieldDescription>
              {requestError ? (
                <FieldError className="flex items-center gap-1.5">
                  <CircleAlertIcon className="size-3.5" />
                  {requestError}
                </FieldError>
              ) : null}
            </Field>
            <Field>
              <SubmitButton
                size="lg"
                className="h-10 w-full [&_svg]:transition-transform [&_svg]:duration-150 hover:[&_svg]:translate-x-0.5"
                pendingLabel="Sending code…"
              >
                Continue
                <ArrowRightIcon data-icon="inline-end" />
              </SubmitButton>
            </Field>
          </form>
        )}

        {googleConfigured ? (
          <>
            <FieldSeparator>or</FieldSeparator>
            <Field>
              <a
                href="/api/auth/google"
                onClick={() => setGooglePending(true)}
                aria-busy={googlePending}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-10 w-full"
                )}
              >
                {googlePending ? (
                  <Spinner />
                ) : (
                  <GoogleMark className="size-4" />
                )}
                {googlePending ? "Opening Google…" : "Sign in with Google"}
              </a>
            </Field>
          </>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Google sign-in is not configured.
          </p>
        )}
      </FieldGroup>
    </div>
  )
}
