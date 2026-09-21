import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { HOME_COOKIE, SESSION_COOKIE } from "@/lib/auth/constants"

const APP_PREFIXES = [
  "/student",
  "/faculty",
  "/mentor",
  "/supervisor",
  "/hod",
  "/dean",
  "/admin",
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)

  if (pathname === "/login" && hasSession) {
    const home = request.cookies.get(HOME_COOKIE)?.value || "/student"
    return NextResponse.redirect(new URL(home, request.url))
  }

  const needsSession =
    pathname === "/declare" ||
    APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (needsSession && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/login",
    "/declare",
    "/student/:path*",
    "/faculty/:path*",
    "/mentor/:path*",
    "/supervisor/:path*",
    "/hod/:path*",
    "/dean/:path*",
    "/admin/:path*",
  ],
}
