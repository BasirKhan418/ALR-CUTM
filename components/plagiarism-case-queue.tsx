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
import { caseStatusLabel } from "@/lib/domain/plagiarism"
import type { PlagiarismCaseQueueItem } from "@/lib/plagiarism/types"
import { formatWhen } from "@/lib/ui/format"

export function PlagiarismCaseQueue({
  items,
  hrefBase,
  empty,
}: {
  items: PlagiarismCaseQueueItem[]
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
            <TableHead className="pl-4">Case</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Response due</TableHead>
            <TableHead className="pr-3">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="relative cursor-pointer hover:bg-muted/40">
              <TableCell className="pl-4">
                <Link
                  href={`${hrefBase}/${item.id}`}
                  className="font-medium after:absolute after:inset-0 hover:underline"
                >
                  {item.title}
                </Link>
              </TableCell>
              <TableCell className="text-sm">{item.courseCode}</TableCell>
              <TableCell className="text-sm">{item.studentNames}</TableCell>
              <TableCell>
                <Badge variant="outline">{caseStatusLabel(item.status)}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatWhen(item.responseDueAt)}
                {item.responseExpired ? (
                  <span className="ml-2 text-foreground">Expired</span>
                ) : null}
              </TableCell>
              <TableCell className="pr-3">
                <Link
                  href={`${hrefBase}/${item.id}`}
                  className="relative z-10 inline-flex items-center text-sm font-medium hover:underline"
                >
                  Open
                  <ChevronRightIcon className="size-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
