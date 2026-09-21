import { CAMPUSES } from "@/lib/domain/campuses"
import { Campus } from "@/lib/db/models/campus"
import { Setting } from "@/lib/db/models/setting"
import { connectMongo } from "@/lib/db/mongo"

async function seed() {
  await connectMongo()

  for (const campus of CAMPUSES) {
    await Campus.updateOne(
      { slug: campus.slug },
      { $set: { slug: campus.slug, name: campus.name, active: true } },
      { upsert: true }
    )
  }

  const settings = [
    { key: "archivalPolicy", value: "WORKING_COPY_BESIDE_HARDBOUND" },
    { key: "yearWiseUsesFiveCriterion", value: true },
    { key: "programWiseUsesFiveCriterion", value: true },
  ] as const

  for (const setting of settings) {
    await Setting.updateOne(
      { key: setting.key },
      { $set: { key: setting.key, value: setting.value } },
      { upsert: true }
    )
  }

  const campusCount = await Campus.countDocuments({
    slug: { $in: CAMPUSES.map((campus) => campus.slug) },
  })
  console.log(`seed-m00: upserted ${campusCount} campuses and default settings`)
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
