import NextAuth from "next-auth"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { z } from "zod"
import { logLogin } from "@/lib/user-log"

// Generate random session token using Web Crypto API (Edge Runtime compatible)
function generateSessionToken(): string {
  // Use Web Crypto API which is available in both Edge and Node.js runtimes
  const array = new Uint8Array(32)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Fallback: generate pseudo-random values (shouldn't happen in modern environments)
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  // Convert to base64url string (Edge Runtime compatible)
  // Use btoa if Buffer is not available (Edge Runtime)
  if (typeof Buffer !== "undefined") {
    const base64 = Buffer.from(array).toString("base64")
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  } else {
    // Fallback for Edge Runtime: use TextDecoder and btoa
    const binary = String.fromCharCode(...array)
    const base64 = btoa(binary)
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Helper function to create database session record and return session ID
async function createDatabaseSession(userId: string, sessionToken: string, expires: Date): Promise<string | null> {
  try {
    // Delete any existing sessions for this user (optional: you can allow multiple sessions)
    await prisma.session.deleteMany({
      where: { userId },
    })

    // Create new session
    const session = await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires,
      },
    })
    
    return session.id
  } catch (error) {
    console.error("Failed to create database session:", error)
    return null
  }
}

// Helper function to check if session exists in database
async function validateDatabaseSession(sessionId: string | null | undefined, userId?: string): Promise<boolean> {
  if (!sessionId) return false
  
  try {
    // PRIORITY CHECK: If userId is provided, first verify user has at least one active session
    // This ensures that if admin force logs out (deletes all sessions), token is invalidated immediately
    // This check happens first because it's the most important for force logout scenarios
    if (userId) {
      const activeSessionCount = await prisma.session.count({
        where: {
          userId: userId,
          expires: {
            gt: new Date(), // Only active (non-expired) sessions
          },
        },
      })
      
      if (activeSessionCount === 0) {
        // User has no active sessions (was force logged out or all sessions expired)
        return false
      }
    }
    
    // Then, check the specific session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, expires: true, userId: true },
    })
    
    if (!session) {
      return false // Session was removed from database
    }
    
    // Check if session has expired
    if (session.expires < new Date()) {
      // Delete expired session
      await prisma.session.delete({
        where: { id: sessionId },
      })
      return false
    }
    
    // Validate that the session belongs to the correct user (security check)
    if (userId && session.userId !== userId) {
      return false // Session doesn't belong to this user
    }
    
    return true // Session is valid
  } catch (error) {
    console.error("Failed to validate database session:", error)
    return false
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt", // Credentials provider requires JWT strategy
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password are required")
          }

          const { email, password } = loginSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            throw new Error("No user found with this email address")
          }

          if (!user.password) {
            throw new Error("Invalid account configuration")
          }

          const isPasswordValid = await compare(password, user.password)

          if (!isPasswordValid) {
            throw new Error("Incorrect password. Please try again")
          }

          if (user.status !== "active") {
            throw new Error("Your account has been deactivated. Please contact support")
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || "User",
            role: user.role,
            image: user.image || null,
          }
        } catch (error) {
          // Let the error message bubble up for better UX
          if (error instanceof Error) {
            throw error
          }
          throw new Error("Authentication failed. Please try again")
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On initial login, create database session
      if (user) {
        token.id = user.id
        token.role = user.role
        token.image = user.image || null
        
        // Create database session record when user signs in
        // Generate a session token and store it in database for tracking
        const sessionToken = generateSessionToken()
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        
        // Create database session and store session ID in token
        const sessionId = await createDatabaseSession(user.id, sessionToken, expires)
        if (sessionId) {
          token.sessionId = sessionId
        }
      }
      
      // On every request, validate database session exists
      // If session was removed from database, invalidate the token
      // Also check if user has any active sessions (for force logout scenarios)
      if (token.sessionId && token.id) {
        const isValid = await validateDatabaseSession(
          token.sessionId as string,
          token.id as string
        )
        if (!isValid) {
          // Session was removed from database or user was force logged out - invalidate token
          token.sessionId = undefined
          token.id = undefined
          token.role = undefined
          token.image = undefined
        } else {
          // Fetch latest user data from database to ensure session is up-to-date
          // This ensures profile photo and other changes are reflected immediately
          try {
            const user = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                image: true,
              },
            })
            
            if (user) {
              // Update token with latest user data
              token.role = user.role
              token.image = user.image || null
            }
          } catch (error) {
            // If fetching user fails, keep existing token data
            console.error("Failed to fetch user data for session update:", error)
          }
        }
      }
      
      return token
    },
    async session({ session, token }) {
      // If token is invalid (no sessionId or user data cleared), return session without user data
      // This happens when database session is removed - NextAuth will treat user as logged out
      if (!token.sessionId || !token.id) {
        // Don't populate user data - NextAuth will treat this as invalid session
        return session
      }
      
      // Ensure session and user exist before assigning
      if (session?.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.image = token.image as string | null
      }
      return session
    },
    async signIn({ user }) {
      // Log successful login
      if (user?.id) {
        try {
          await logLogin(user.id, true)
        } catch (error) {
          // Don't fail login if logging fails
          console.error("Failed to log login:", error)
        }
      }
      return true
    },
  },
})