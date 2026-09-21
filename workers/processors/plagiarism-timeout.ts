import { PlagiarismCase } from "@/lib/db/models/plagiarism-case"
import { connectMongo } from "@/lib/db/mongo"

export async function processCaseTimeout() {
  await connectMongo()
  const result = await PlagiarismCase.updateMany(
    {
      status: { $in: ["OPEN", "STUDENT_RESPONDED"] },
      responseExpired: { $ne: true },
      responseDueAt: { $lte: new Date() },
    },
    { $set: { responseExpired: true } }
  )
  return { closed: result.modifiedCount }
}
