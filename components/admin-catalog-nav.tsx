"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/admin", label: "People" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/settings", label: "Settings" },
] as const

export function AdminCatalogNav({ current }: { current: (typeof ITEMS)[number]["href"] }) {
  return (
    <nav className="flex w-fit rounded-lg bg-muted p-[3px]">
      {ITEMS.map((item) => {
        const active = item.href === current
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-7 items-center rounded-md px-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
