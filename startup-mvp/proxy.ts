import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_ROUTES = ["/", "/about", "/contact"]
const AUTH_ROUTES = ["/login", "/registration", "/auth/", "/api/auth/"]

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname

  // Allow auth-related routes
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route)) {
    return NextResponse.next()
  }

  // Validate session
  const isLoggedIn = !!(req.auth?.user?.id && req.auth?.user?.email)
  const isProtectedRoute = pathname.startsWith("/dashboard")

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

