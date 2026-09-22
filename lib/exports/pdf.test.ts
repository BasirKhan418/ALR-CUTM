import assert from "node:assert/strict"
import { inflateSync } from "node:zlib"
import { test } from "node:test"
import { BOOKLET_SECTIONS } from "@/lib/domain/booklet"
import { DECLARATION_TEXT } from "@/lib/domain/declaration"
import { renderBooklet, renderWorkshopCertificate } from "./pdf.ts"

function pdfText(bytes: Uint8Array) {
  const raw = Buffer.from(bytes).toString("latin1")
  const chunks = [raw]
  const streams = raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)
  for (const match of streams) {
    try {
      chunks.push(inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"))
    } catch {
      // Uncompressed streams stay in the raw PDF.
    }
  }
  return chunks.join("\n").replace(/<([0-9A-Fa-f]+)>/g, (_, hex: string) => {
    if (hex.length % 2 !== 0) return `<${hex}>`
    return Buffer.from(hex, "hex").toString("latin1")
  })
}

const booklet = {
  university: "Centurion University of Technology and Management",
  campusName: "Bhubaneswar",
  studentName: "Bhubaneswar Student",
  registrationNo: "BBSR-STU-001",
  email: "student.bbsr@cutm.ac.in",
  programmeName: "B.Tech Computer Science",
  academicYearLabel: "2025-26",
  declarationText: DECLARATION_TEXT,
  declarationAcceptedAt: "2026-09-22",
  index: ["Action learning · ALR-YEAR-2025"],
  excerpts: [{ heading: "Action learning", body: "Workshop reflection." }],
  rubric: [{ heading: "Year 2025-26", lines: ["Coverage of courses: 18 / 20", "Total: 90 / 100"] }],
  creditLine: "Compulsory Basket: 1 credit for 2025-26.",
  archivalSentence:
    "The digital Learning Record is a working copy kept beside the hardbound booklet.",
}

test("booklet PDF contains the named sections in order", async () => {
  const text = pdfText(await renderBooklet(booklet))
  let cursor = 0
  for (const section of BOOKLET_SECTIONS) {
    const at = text.indexOf(section, cursor)
    assert.ok(at >= cursor, `missing ${section}`)
    cursor = at + section.length
  }
  assert.match(text, /Centurion University of Technology and Management/)
  assert.match(text, /Bhubaneswar Student/)
  assert.match(text, /2026-09-22/)
  assert.ok(text.includes(DECLARATION_TEXT.slice(0, 40)))
  assert.match(text, /Compulsory Basket: 1 credit for 2025-26/)
  assert.match(text, /working copy kept beside the hardbound booklet/)
})

test("workshop certificate sums the hours and date range", async () => {
  const text = pdfText(
    await renderWorkshopCertificate({
      university: "Centurion University of Technology and Management",
      studentName: "Bhubaneswar Student",
      courseCode: "ALR-WORK",
      courseTitle: "Workshop",
      totalHours: 6,
      from: "2026-01-02",
      to: "2026-03-04",
    })
  )
  assert.match(text, /Total hours: 6/)
  assert.match(text, /2026-01-02 to 2026-03-04/)
})
