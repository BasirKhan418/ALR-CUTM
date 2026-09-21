import { Badge } from "@/components/ui/badge"
import { CoursePreview } from "@/components/course-preview"
import type { CatalogCourse } from "@/lib/catalog/queries"
import { combinationLabel } from "@/lib/domain/subject-map"

export function StudentCourses({ courses }: { courses: CatalogCourse[] }) {
  if (courses.length === 0) {
    return (
      <div className="rounded-xl bg-card p-8 text-sm text-muted-foreground ring-1 ring-foreground/10">
        You are not enrolled in a course this term. Ask your faculty to add you.
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {courses.map((course) => (
        <article
          key={course.id}
          className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{course.code}</p>
              <h2 className="mt-1 font-heading text-xl font-semibold">
                {course.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {course.termName} · {course.departmentName}
              </p>
            </div>
            <Badge variant="outline">Not opened</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{combinationLabel(course.combinationCode)}</Badge>
            <Badge variant="secondary">Delivery {course.deliveryMode}</Badge>
          </div>
          <CoursePreview
            configs={course.recordConfigs}
            deliveryMode={course.deliveryMode}
          />
        </article>
      ))}
    </div>
  )
}
