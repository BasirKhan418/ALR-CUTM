import { NextResponse } from "next/server"
import { lookupIndustryToken } from "@/lib/actions/industry"

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const found = await lookupIndustryToken(token)
  if (found.status !== "ok") {
    return NextResponse.json({ ok: false, status: found.status }, { status: 404 })
  }
  return NextResponse.json({
    ok: true,
    title: found.title,
    students: found.students,
    org: found.org,
    alreadySaved: found.alreadySaved,
  })
}
