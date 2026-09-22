import { Setting } from "@/lib/db/models/setting"
import { connectMongo } from "@/lib/db/mongo"
import {
  PROGRAM_RUBRIC_SETTING,
  PROGRAM_SCALE_SETTING,
  YEAR_RUBRIC_SETTING,
} from "@/lib/domain/tiers"

export type TierSettings = {
  yearWiseUsesFiveCriterion: boolean
  programWiseUsesFiveCriterion: boolean
  programCumulateScale: number
}

function flag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

export async function readTierSettings(): Promise<TierSettings> {
  await connectMongo()
  const rows = await Setting.find({
    key: { $in: [YEAR_RUBRIC_SETTING, PROGRAM_RUBRIC_SETTING, PROGRAM_SCALE_SETTING] },
  }).lean()
  const byKey = new Map(rows.map((row) => [row.key, row.value]))
  const scale = Number(byKey.get(PROGRAM_SCALE_SETTING))
  return {
    yearWiseUsesFiveCriterion: flag(byKey.get(YEAR_RUBRIC_SETTING), true),
    programWiseUsesFiveCriterion: flag(byKey.get(PROGRAM_RUBRIC_SETTING), true),
    programCumulateScale:
      Number.isFinite(scale) && scale >= 1 && scale <= 100 ? scale : 100,
  }
}

export async function writeTierSettings(settings: TierSettings) {
  if (
    !Number.isFinite(settings.programCumulateScale) ||
    settings.programCumulateScale < 1 ||
    settings.programCumulateScale > 100
  ) {
    throw new Error("Program cumulation scale must be between 1 and 100.")
  }
  await connectMongo()
  await Promise.all([
    Setting.findOneAndUpdate(
      { key: YEAR_RUBRIC_SETTING },
      { $set: { key: YEAR_RUBRIC_SETTING, value: settings.yearWiseUsesFiveCriterion } },
      { upsert: true }
    ),
    Setting.findOneAndUpdate(
      { key: PROGRAM_RUBRIC_SETTING },
      {
        $set: {
          key: PROGRAM_RUBRIC_SETTING,
          value: settings.programWiseUsesFiveCriterion,
        },
      },
      { upsert: true }
    ),
    Setting.findOneAndUpdate(
      { key: PROGRAM_SCALE_SETTING },
      { $set: { key: PROGRAM_SCALE_SETTING, value: settings.programCumulateScale } },
      { upsert: true }
    ),
  ])
  return settings
}
