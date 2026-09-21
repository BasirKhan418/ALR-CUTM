import { Campus } from "@/lib/db/models/campus"
import { Course } from "@/lib/db/models/course"
import { Department } from "@/lib/db/models/department"
import { Enrollment } from "@/lib/db/models/enrollment"
import { FacultyAssignment } from "@/lib/db/models/faculty-assignment"
import { Programme } from "@/lib/db/models/programme"
import { Term } from "@/lib/db/models/term"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import {
  buildRecordConfigs,
  deliveryModeFor,
} from "@/lib/domain/catalog"
import { COMBINATION_CODES, combinationLabel } from "@/lib/domain/subject-map"
import { CLASSROOM_COMPOSITE_DEFAULT } from "@/lib/domain/weights"
import { writeClassroomComposites } from "@/lib/catalog/settings"

async function seed() {
  await connectMongo()
  await writeClassroomComposites({ ...CLASSROOM_COMPOSITE_DEFAULT })

  const campus = await Campus.findOne({ slug: "bhubaneswar" })
  const department = await Department.findOne({
    campusId: campus?._id,
    code: "CSE",
  })
  const programme = await Programme.findOne({
    campusId: campus?._id,
    departmentId: department?._id,
    name: "B.Tech Computer Science",
  })
  const student = await User.findOne({ email: "student.bbsr@cutm.ac.in" })
  const faculty = await User.findOne({ email: "faculty.bbsr@cutm.ac.in" })
  const mentor = await User.findOne({ email: "mentor.bbsr@cutm.ac.in" })
  const admin = await User.findOne({ email: "admin.bbsr@cutm.ac.in" })

  if (!campus || !department || !programme || !student || !faculty || !mentor || !admin) {
    throw new Error("Run npm run seed:m01 first — Bhubaneswar org or users are missing.")
  }

  const term = await Term.findOneAndUpdate(
    { academicYear: "2026-27", name: "Odd Semester 2026" },
    {
      $set: {
        name: "Odd Semester 2026",
        academicYear: "2026-27",
        startsAt: new Date("2026-07-01"),
        endsAt: new Date("2026-12-31"),
      },
    },
    { upsert: true, returnDocument: "after" }
  )

  console.log("seed-m02: term", term.name, term.academicYear)

  for (const combinationCode of COMBINATION_CODES) {
    const code = `ALR-${combinationCode.replaceAll("_", "-")}`
    const course = await Course.findOneAndUpdate(
      { code, termId: term._id },
      {
        $set: {
          campusId: campus._id,
          departmentId: department._id,
          programmeId: programme._id,
          code,
          title: `${combinationLabel(combinationCode)} Learning Record`,
          termId: term._id,
          combinationCode,
          deliveryMode: deliveryModeFor(combinationCode),
          recordConfigs: buildRecordConfigs(combinationCode),
          createdBy: admin._id,
        },
      },
      { upsert: true, returnDocument: "after" }
    )

    await FacultyAssignment.updateOne(
      { courseId: course._id, userId: faculty._id, role: "FACULTY" },
      {
        $set: {
          courseId: course._id,
          userId: faculty._id,
          role: "FACULTY",
        },
      },
      { upsert: true }
    )

    if (combinationCode === "THEORY_PRACTICE_PROJECT") {
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
      await FacultyAssignment.updateOne(
        { courseId: course._id, userId: mentor._id, role: "MENTOR" },
        {
          $set: {
            courseId: course._id,
            userId: mentor._id,
            role: "MENTOR",
          },
        },
        { upsert: true }
      )
    }

    console.log(
      `  ${code}  ${combinationCode}  ${course.recordConfigs.length} records  ${course.deliveryMode}`
    )
  }

  console.log(
    "seed-m02: enrolled student.bbsr@cutm.ac.in in ALR-THEORY-PRACTICE-PROJECT"
  )
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
