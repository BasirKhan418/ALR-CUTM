"use client"

import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deliverableLabel, deliverableStatusLabel } from "@/lib/domain/deliverable"
import type { DeliverableQueueItem } from "@/lib/deliverable/types"
import { formatWhen } from "@/lib/ui/format"

export function SignoffQueue({
  items,
  hrefBase,
  empty,
}: {
  items: DeliverableQueueItem[]
  hrefBase: string
  empty: string
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-card px-6 py-12 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        {empty}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <Table className="min-w-[48rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Deliverable</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Candidates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="pr-3">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={`${item.waitingKind}-${item.id}-${item.waitingOn}`}
              className="relative hover:bg-muted/40"
            >
              <TableCell className="pl-4">
                <Link
                  href={`${hrefBase}/${item.id}`}
                  className="font-medium after:absolute after:inset-0 hover:underline"
                >
                  {item.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {deliverableLabel(item.type)}
                </p>
              </TableCell>
              <TableCell>
                <p className="font-medium">{item.courseCode}</p>
                <p className="max-w-48 truncate text-xs text-muted-foreground">
                  {item.courseTitle}
                </p>
              </TableCell>
              <TableCell className="text-sm">{item.candidateNames}</TableCell>
              <TableCell>
                <Badge variant="outline">{deliverableStatusLabel(item.status)}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatWhen(item.updatedAt)}
              </TableCell>
              <TableCell className="pr-3">
                <Link
                  href={`${hrefBase}/${item.id}`}
                  className="relative z-10 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  Review
                  <ChevronRightIcon className="size-3.5" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
