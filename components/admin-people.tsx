"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  UserRoundXIcon,
} from "lucide-react"
import { CreateUserForm } from "@/components/create-user-form"
import { UserAvatar } from "@/components/user-avatar"
import { deleteUser, setUserActive } from "@/lib/actions/users"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatWhen, loginMethodLabel, roleLabel } from "@/lib/ui/format"

export type AdminPerson = {
  id: string
  name: string
  email: string
  roles: string[]
  campusName: string
  active: boolean
  lastLoginAt: string | null
  lastLoginMethod: string | null
}

export function AdminPeople({
  people,
  campuses,
  currentUserId,
}: {
  people: AdminPerson[]
  campuses: { id: string; name: string }[]
  currentUserId: string
}) {
  const [query, setQuery] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<AdminPerson | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return people
    return people.filter((person) => {
      const haystack = [
        person.name,
        person.email,
        person.campusName,
        ...person.roles.map(roleLabel),
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [people, query])

  const activeCount = people.filter((person) => person.active).length
  const neverSignedIn = people.filter((person) => !person.lastLoginAt).length

  function mutate(
    action: () => Promise<{ ok: boolean; message?: string }>,
    fallback: string
  ) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        toast.success(result.message ?? fallback)
        setPendingDelete(null)
        return
      }
      toast.error(result.message ?? "That change could not be saved.")
    })
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Administration</p>
          <h1 className="font-heading text-3xl font-semibold">People</h1>
          <p className="text-sm text-muted-foreground">
            {people.length} provisioned · {activeCount} active · {neverSignedIn}{" "}
            never signed in
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="h-8 w-full pl-8 sm:w-56"
            />
          </div>
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open)
              if (open) setFormKey((key) => key + 1)
            }}
          >
            <DialogTrigger className={cn(buttonVariants())}>
              <PlusIcon data-icon="inline-start" />
              Add person
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add person</DialogTitle>
                <DialogDescription>
                  Name, campus email, and at least one role. We email them a
                  sign-in invite — no temporary password.
                </DialogDescription>
              </DialogHeader>
              <CreateUserForm
                key={formKey}
                campuses={campuses}
                onSuccess={(message) => {
                  toast.success("Person added", { description: message })
                  setCreateOpen(false)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Person</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="hidden md:table-cell">Campus</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">
                Last sign-in
              </TableHead>
              <TableHead className="w-12 pr-2">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-4 py-14">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <UserRoundXIcon className="size-5 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {people.length === 0
                        ? "No one is provisioned yet"
                        : "No one matches that search"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {people.length === 0
                        ? "Add a person to let them sign in with email OTP or Google."
                        : "Try a name, email, campus, or role."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((person) => {
                const isSelf = person.id === currentUserId
                return (
                  <TableRow key={person.id}>
                    <TableCell className="pl-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar name={person.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {person.name}
                            {isSelf ? (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                you
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {person.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {person.roles.map((role) => (
                          <Badge key={role} variant="outline">
                            {roleLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {person.campusName}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span
                          className={
                            person.active
                              ? "size-1.5 rounded-full bg-primary"
                              : "size-1.5 rounded-full bg-muted-foreground/40"
                          }
                        />
                        {person.active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {person.lastLoginAt
                        ? `${loginMethodLabel(person.lastLoginMethod)} · ${formatWhen(person.lastLoginAt)}`
                        : "Never"}
                    </TableCell>
                    <TableCell className="pr-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Actions for ${person.name}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon-sm" })
                          )}
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-40">
                          <DropdownMenuItem
                            disabled={isSelf && person.active}
                            onClick={() =>
                              mutate(
                                () =>
                                  setUserActive(person.id, !person.active),
                                person.active ? "Deactivated" : "Activated"
                              )
                            }
                          >
                            {person.active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isSelf}
                            onClick={() => setPendingDelete(person)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </section>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.email} will be removed and cannot sign in. Audit
              history is kept. You can add them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending || !pendingDelete}
              onClick={() => {
                if (!pendingDelete) return
                mutate(() => deleteUser(pendingDelete.id), "Person removed")
              }}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
