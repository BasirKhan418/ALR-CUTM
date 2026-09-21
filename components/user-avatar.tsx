import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/ui/format"
import { cn } from "@/lib/utils"

export function UserAvatar({
  name,
  size = "default",
  className,
}: {
  name: string
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback
        className={cn(
          "bg-primary/10 font-medium text-primary",
          size === "lg" && "text-sm"
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
