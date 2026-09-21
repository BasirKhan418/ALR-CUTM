import { Skeleton } from "@/components/ui/skeleton"

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-svh w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar p-3 md:flex md:flex-col">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 px-1">
          <Skeleton className="mb-1 h-2.5 w-16" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
              <Skeleton className="size-7 rounded-md" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2.5 px-2 py-2">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 border-b px-4">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="ml-auto h-6 w-24 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
        </div>
        <div className="p-6 md:p-8">
          <WorkspaceSkeleton />
        </div>
      </div>
    </div>
  )
}

export function WorkspaceSkeleton() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function AdminSkeleton() {
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

export function LoginSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="mx-auto h-3 w-8" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}
