import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

const PUBLIC_ROUTES = ["/", "/about", "/contact"]
const AUTH_ROUTES = ["/login", "/registration", "/auth/", "/api/auth/"]
const SETUP_ROUTES = ["/setup", "/api/setup"]

// In-memory cache for setup status
let setupCache: { isSetup: boolean; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Export function to invalidate cache after setup
export function invalidateSetupCache() {
  setupCache = null
}

async function checkSetupStatus(): Promise<boolean> {
  const now = Date.now()
  
  // Return cached result if still valid
  if (setupCache && (now - setupCache.timestamp) < CACHE_TTL) {
    return setupCache.isSetup
  }
  
  // Query database for user count
  try {
    const userCount = await prisma.user.count()
    const isSetup = userCount > 0
    
    // Update cache
    setupCache = { isSetup, timestamp: now }
    
    return isSetup
  } catch (error) {
    console.error("Failed to check setup status:", error)
    // If DB query fails, assume setup is needed to be safe
    return false
  }
}

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname

  // Allow setup-related routes
  if (SETUP_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if initial setup is needed
  const isSetup = await checkSetupStatus()
  
  if (!isSetup) {
    // Redirect all routes to setup page if not setup
    if (pathname !== "/setup") {
      const setupUrl = new URL("/setup", req.url)
      return NextResponse.redirect(setupUrl)
    }
    return NextResponse.next()
  }

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

