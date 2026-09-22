import { NextResponse } from "next/server"
import { Types } from "mongoose"
import { hasRole, requireSession } from "@/lib/auth/guards"
import { connectMongo } from "@/lib/db/mongo"
import { YearEvaluation } from "@/lib/db/models/year-evaluation"
import { ProgramEvaluation } from "@/lib/db/models/program-evaluation"
import {
  programExportRelative,
  readExportFile,
  yearExportRelative,
} from "@/lib/tiers/files"

export async function GET(request: Request) {
  const session = await requireSession()
  if (!hasRole(session, "ADMIN", "DEAN", "EXAM_CELL")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const campus = url.searchParams.get("campus") ?? ""
  const year = url.searchParams.get("year") ?? ""
  const scope = url.searchParams.get("scope")
  const student = url.searchParams.get("student") ?? ""

  if (!Types.ObjectId.isValid(campus)) {
    return NextResponse.json({ ok: false, message: "Campus is required." }, { status: 400 })
  }
  if (
    !hasRole(session, "ADMIN", "EXAM_CELL") &&
    session.campusId !== campus
  ) {
    return NextResponse.json(
      { ok: false, message: "This export is for another campus." },
      { status: 403 }
    )
  }

  await connectMongo()

  try {
    if (scope === "program") {
      if (!Types.ObjectId.isValid(student)) {
        return NextResponse.json({ ok: false, message: "Student is required." }, { status: 400 })
      }
      const program = await ProgramEvaluation.findOne({ studentId: student, campusId: campus }).lean()
      if (!program || program.examCellExport?.status !== "READY") {
        return NextResponse.json(
          { ok: false, message: "Export file is not ready. Run the exam-cell export first." },
          { status: 404 }
        )
      }
      const body = await readExportFile(programExportRelative(campus, student))
      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="exam-cell-program-${student}.json"`,
        },
      })
    }

    if (!year) {
      return NextResponse.json({ ok: false, message: "Year is required." }, { status: 400 })
    }
    const ready = await YearEvaluation.findOne({
      campusId: campus,
      academicYear: year,
      "examCellExport.status": "READY",
    }).lean()
    if (!ready) {
      return NextResponse.json(
        { ok: false, message: "Export file is not ready. Run the exam-cell export first." },
        { status: 404 }
      )
    }
    const body = await readExportFile(yearExportRelative(campus, year))
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="exam-cell-${year}.json"`,
      },
    })
  } catch {
    return NextResponse.json(
      { ok: false, message: "Export file is not ready. Run the exam-cell export first." },
      { status: 404 }
    )
  }
}
