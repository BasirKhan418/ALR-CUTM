"use client"

import { usePathname } from "next/navigation"
import { LogOutIcon, MapPinIcon } from "lucide-react"
import { signOut } from "@/lib/actions/auth"
import { SubmitButton } from "@/components/submit-button"
import { UserAvatar } from "@/components/user-avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { APP_SHELL_NAV } from "@/lib/domain/roles"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function titleFor(pathname: string) {
  const item = APP_SHELL_NAV.find(
    (nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  )
  return item?.label ?? "Learning Record"
}

export function SiteHeader({
  name,
  email,
  campusName,
}: {
  name: string
  email: string
  campusName: string
}) {
  const pathname = usePathname()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger className="-ml-1 transition-transform duration-150 hover:scale-105" />
      <Separator orientation="vertical" className="h-4" />
      <p className="font-heading text-sm font-medium">{titleFor(pathname)}</p>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="secondary" className="hidden h-6 gap-1 sm:inline-flex">
          <MapPinIcon />
          {campusName}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-9 gap-2 px-1.5"
            )}
          >
            <UserAvatar name={name} size="sm" />
            <span className="hidden max-w-36 truncate text-sm font-medium md:inline">
              {name}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-medium text-foreground">
                  {name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <form action={signOut} className="p-1">
              <SubmitButton
                variant="ghost"
                size="sm"
                pendingLabel="Signing out…"
                className="h-8 w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <LogOutIcon />
                Sign out
              </SubmitButton>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
