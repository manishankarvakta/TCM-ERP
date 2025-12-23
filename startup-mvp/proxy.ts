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
  const isProtectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/admin")
  const isAdminRoute = pathname.startsWith("/admin")
  const userRole = req.auth?.user?.role?.toLowerCase()

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect non-admin users from admin routes
  if (isAdminRoute && isLoggedIn && userRole !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Redirect admin users from dashboard routes to /admin
  const isDashboardRoute = pathname.startsWith("/dashboard")
  if (isDashboardRoute && isLoggedIn && userRole === "admin") {
    return NextResponse.redirect(new URL("/admin", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

