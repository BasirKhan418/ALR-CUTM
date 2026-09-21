"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"
import {
  uploadProgrammingZip,
  type PlagiarismFormState,
} from "@/lib/actions/plagiarism"
import { PlagiarismReportPanel } from "@/components/plagiarism-report-panel"
import { SubmitButton } from "@/components/submit-button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { ProgrammingUploadView } from "@/lib/plagiarism/types"

const INITIAL: PlagiarismFormState = { ok: false }

export function ProgrammingUploadCard({
  courseId,
  upload,
}: {
  courseId: string
  upload: ProgrammingUploadView | null
}) {
  const [state, action] = useActionState(uploadProgrammingZip, INITIAL)
  return (
    <div className="flex flex-col gap-4">
      <form
        action={action}
        className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
      >
        <input type="hidden" name="courseId" value={courseId} />
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Programming Practice
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One zip per course. It is scored on the code-similarity queue, never
            the prose engine.
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="programming-zip">Zip file</FieldLabel>
          <Input
            id="programming-zip"
            name="file"
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            required
          />
        </Field>
        {upload ? (
          <a
            href={`/api/files/${upload.fileId}`}
            className="text-sm font-medium hover:underline"
          >
            Current file: {upload.fileName}
          </a>
        ) : null}
        {state.message ? (
          state.ok ? (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          ) : (
            <FieldError className="flex items-center gap-1.5">
              <CircleAlertIcon className="size-3.5" />
              {state.message}
            </FieldError>
          )
        ) : null}
        <SubmitButton pendingLabel="Uploading…">
          {upload ? "Replace zip" : "Upload zip"}
        </SubmitButton>
      </form>
      {upload?.report ? (
        <PlagiarismReportPanel report={upload.report} />
      ) : null}
    </div>
  )
}
