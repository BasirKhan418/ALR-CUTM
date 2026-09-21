import { Course } from "@/lib/db/models/course"
import { Enrollment } from "@/lib/db/models/enrollment"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"

async function seed() {
  await connectMongo()

  const student = await User.findOne({ email: "student.bbsr@cutm.ac.in" })
  const term = await Term.findOne({
    academicYear: "2026-27",
    name: "Odd Semester 2026",
  })
  if (!student || !term) {
    throw new Error("Run npm run seed:m01 and seed:m02 first.")
  }

  const workshop = await Course.findOne({
    code: "ALR-WORKSHOP",
    termId: term._id,
  })
  const theory = await Course.findOne({
    code: "ALR-THEORY",
    termId: term._id,
  })
  const combo = await Course.findOne({
    code: "ALR-THEORY-PRACTICE-PROJECT",
    termId: term._id,
  })

  if (!workshop || !theory || !combo) {
    throw new Error("Run npm run seed:m02 first — ALR catalog courses are missing.")
  }

  for (const course of [combo, workshop, theory]) {
    await Enrollment.updateOne(
      { studentId: student._id, courseId: course._id, termId: term._id },
      {
        $set: {
          studentId: student._id,
          courseId: course._id,
          termId: term._id,
        },
      },
      { upsert: true }
    )
    console.log(`seed-m03: enrolled ${student.email} in ${course.code}`)
  }

  console.log(
    "seed-m03: THEORY_PRACTICE_PROJECT + WORKSHOP + THEORY ready for Submit LR"
  )
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
