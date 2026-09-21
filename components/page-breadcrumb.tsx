import type { ReactNode } from "react"
import Link from "next/link"

export function PageBreadcrumb({
  items,
  extra,
}: {
  items: { href?: string; label: string }[]
  extra?: ReactNode
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden>/</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
      {extra ? <div className="ml-auto">{extra}</div> : null}
    </nav>
  )
}
