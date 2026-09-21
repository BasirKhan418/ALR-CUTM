import Link from "next/link"
import { cn } from "@/lib/utils"

export type FacultyCourseTab = "setup" | "classroom" | "gradebook" | "deliverables"

export function FacultyCourseTabs({
  courseId,
  active,
  showClassroom,
  showDeliverables,
}: {
  courseId: string
  active: FacultyCourseTab
  showClassroom: boolean
  showDeliverables?: boolean
}) {
  const items: { id: FacultyCourseTab; label: string; href: string; show: boolean }[] = [
    { id: "setup", label: "Setup", href: `/faculty/courses/${courseId}`, show: true },
    {
      id: "classroom",
      label: "Classroom",
      href: `/faculty/courses/${courseId}?tab=classroom`,
      show: showClassroom,
    },
    {
      id: "gradebook",
      label: "Gradebook",
      href: `/faculty/courses/${courseId}?tab=gradebook`,
      show: true,
    },
    {
      id: "deliverables",
      label: "Deliverables",
      href: `/faculty/courses/${courseId}?tab=deliverables`,
      show: Boolean(showDeliverables),
    },
  ]

  return (
    <nav className="flex w-full flex-wrap gap-1 rounded-xl bg-muted p-1 sm:w-fit">
      {items
        .filter((item) => item.show)
        .map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium transition-colors",
              item.id === active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
    </nav>
  )
}
