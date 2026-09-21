import { CAMPUSES } from "@/lib/domain/campuses"
import { Campus } from "@/lib/db/models/campus"
import { Department } from "@/lib/db/models/department"
import { Programme } from "@/lib/db/models/programme"
import { User } from "@/lib/db/models/user"
import { connectMongo } from "@/lib/db/mongo"
import type { Role } from "@/lib/domain/roles"

type SeedUser = {
  email: string
  name: string
  campusSlug: string
  roles: Role[]
  registrationNo?: string
}

const SEED_USERS: SeedUser[] = [
  {
    email: "student.bbsr@cutm.ac.in",
    name: "Bhubaneswar Student",
    campusSlug: "bhubaneswar",
    roles: ["STUDENT"],
    registrationNo: "BBSR-STU-001",
  },
  {
    email: "faculty.bbsr@cutm.ac.in",
    name: "Bhubaneswar Faculty",
    campusSlug: "bhubaneswar",
    roles: ["FACULTY"],
  },
  {
    email: "mentor.bbsr@cutm.ac.in",
    name: "Bhubaneswar Mentor",
    campusSlug: "bhubaneswar",
    roles: ["MENTOR"],
  },
  {
    email: "supervisor.bbsr@cutm.ac.in",
    name: "Bhubaneswar Supervisor",
    campusSlug: "bhubaneswar",
    roles: ["SUPERVISOR"],
  },
  {
    email: "hod.bbsr@cutm.ac.in",
    name: "Bhubaneswar HoD",
    campusSlug: "bhubaneswar",
    roles: ["HOD"],
  },
  {
    email: "dean.bbsr@cutm.ac.in",
    name: "Bhubaneswar Dean",
    campusSlug: "bhubaneswar",
    roles: ["DEAN"],
  },
  {
    email: "admin.bbsr@cutm.ac.in",
    name: "Bhubaneswar Admin",
    campusSlug: "bhubaneswar",
    roles: ["ADMIN"],
  },
  {
    email: "faculty.multi@cutm.ac.in",
    name: "Multi-role Faculty",
    campusSlug: "bhubaneswar",
    roles: ["FACULTY", "MENTOR", "SUPERVISOR"],
  },
  {
    email: "student.pkd@cutm.ac.in",
    name: "Paralakhemundi Student",
    campusSlug: "paralakhemundi",
    roles: ["STUDENT"],
    registrationNo: "PKD-STU-001",
  },
  {
    email: "khanbasir5555@gmail.com",
    name: "Basir Khan",
    campusSlug: "bhubaneswar",
    roles: ["ADMIN"],
  },
]

async function seed() {
  await connectMongo()

  for (const campus of CAMPUSES) {
    await Campus.updateOne(
      { slug: campus.slug },
      { $set: { slug: campus.slug, name: campus.name, active: true } },
      { upsert: true }
    )
  }

  const bbsr = await Campus.findOne({ slug: "bhubaneswar" })
  const pkd = await Campus.findOne({ slug: "paralakhemundi" })
  if (!bbsr || !pkd) {
    throw new Error("Campuses missing after upsert")
  }

  const cseBbsr = await Department.findOneAndUpdate(
    { campusId: bbsr._id, code: "CSE" },
    { $set: { campusId: bbsr._id, code: "CSE", name: "Computer Science" } },
    { upsert: true, returnDocument: "after" }
  )
  const csePkd = await Department.findOneAndUpdate(
    { campusId: pkd._id, code: "CSE" },
    { $set: { campusId: pkd._id, code: "CSE", name: "Computer Science" } },
    { upsert: true, returnDocument: "after" }
  )

  await Programme.findOneAndUpdate(
    { campusId: bbsr._id, departmentId: cseBbsr._id, name: "B.Tech Computer Science" },
    {
      $set: {
        campusId: bbsr._id,
        departmentId: cseBbsr._id,
        name: "B.Tech Computer Science",
        award: "UG",
        durationYears: 4,
        branch: "CSE",
      },
    },
    { upsert: true }
  )
  await Programme.findOneAndUpdate(
    { campusId: pkd._id, departmentId: csePkd._id, name: "B.Tech Computer Science" },
    {
      $set: {
        campusId: pkd._id,
        departmentId: csePkd._id,
        name: "B.Tech Computer Science",
        award: "UG",
        durationYears: 4,
        branch: "CSE",
      },
    },
    { upsert: true }
  )

  const campusBySlug = {
    bhubaneswar: bbsr,
    paralakhemundi: pkd,
  }

  for (const seedUser of SEED_USERS) {
    const campus = campusBySlug[seedUser.campusSlug as keyof typeof campusBySlug]
    const department = seedUser.campusSlug === "paralakhemundi" ? csePkd : cseBbsr
    await User.updateOne(
      { email: seedUser.email },
      {
        $set: {
          name: seedUser.name,
          email: seedUser.email,
          campusId: campus._id,
          departmentId: department._id,
          roles: seedUser.roles,
          active: true,
          ...(seedUser.registrationNo
            ? { registrationNo: seedUser.registrationNo }
            : {}),
        },
      },
      { upsert: true }
    )
  }

  console.log("seed-m01: provisioned users (no passwords)")
  for (const seedUser of SEED_USERS) {
    console.log(`  ${seedUser.email}  ${seedUser.roles.join("+")}`)
  }
  console.log(
    "Dummy emails above skip OTP. New CUTM emails and khanbasir5556@gmail.com still ask for a code."
  )
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
