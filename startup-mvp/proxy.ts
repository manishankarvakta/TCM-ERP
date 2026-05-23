import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

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

  // Redirect /admin to /dashboard for all users
  if (isAdminRoute && isLoggedIn) {
    const newPathname = pathname.replace("/admin", "/dashboard")
    return NextResponse.redirect(new URL(newPathname, req.url))
  }

  // /dashboard/settings is admin-only - redirect non-admin users
  if (pathname.startsWith("/dashboard/settings") && isLoggedIn && userRole !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Admin users have explicit access to /dashboard routes including /dashboard/settings
  // Regular users can access /dashboard routes but not /dashboard/settings

  // Set pathname header for use in layouts
  const response = NextResponse.next()
  response.headers.set("x-pathname", pathname)
  return response
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

