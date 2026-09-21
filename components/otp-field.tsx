"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

const LENGTH = 6

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, LENGTH)
}

export function OtpField({
  name = "code",
  disabled,
}: {
  name?: string
  disabled?: boolean
}) {
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(""))
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const hiddenRef = useRef<HTMLInputElement>(null)

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus()
  }

  function write(next: string[], submit = false) {
    setDigits(next)
    if (hiddenRef.current) {
      hiddenRef.current.value = next.join("")
    }
    if (submit && next.join("").length === LENGTH) {
      hiddenRef.current?.form?.requestSubmit()
    }
  }

  function handleChange(index: number, raw: string) {
    const cleaned = onlyDigits(raw)
    if (cleaned.length > 1) {
      const next = Array(LENGTH).fill("")
      cleaned.split("").forEach((digit, i) => {
        next[i] = digit
      })
      write(next, true)
      focusAt(cleaned.length)
      return
    }
    const next = [...digits]
    next[index] = cleaned.slice(-1)
    write(next, cleaned.length === 1 && index === LENGTH - 1)
    if (cleaned) focusAt(index + 1)
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault()
      const next = [...digits]
      next[index - 1] = ""
      write(next)
      focusAt(index - 1)
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      focusAt(index - 1)
    }
    if (event.key === "ArrowRight") {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const cleaned = onlyDigits(event.clipboardData.getData("text"))
    if (!cleaned) return
    const next = Array(LENGTH).fill("")
    cleaned.split("").forEach((digit, i) => {
      next[i] = digit
    })
    write(next, true)
    focusAt(cleaned.length)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        value={digits.join("")}
        required
      />
      <div
        role="group"
        aria-label="Six-digit one-time code"
        className="flex justify-between gap-1.5"
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              refs.current[index] = node
            }}
            value={digit}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={index === 0 ? LENGTH : 1}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${LENGTH}`}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            className={cn(
              "h-12 w-full min-w-0 rounded-lg border bg-card text-center text-lg font-semibold tabular-nums shadow-none outline-none transition-[border-color,box-shadow,transform] duration-150",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              digit
                ? "border-primary/35"
                : "border-input",
              disabled && "opacity-50"
            )}
          />
        ))}
      </div>
    </div>
  )
}
