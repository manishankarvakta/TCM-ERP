import { signOut, auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { logLogout } from "@/lib/user-log"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function POST() {
  try {
    // Get current session before signing out
    const session = await auth()
    
    // Delete database session record before signing out
    if (session?.user?.id) {
      try {
        await prisma.session.deleteMany({
          where: { userId: session.user.id },
        })
      } catch (error) {
        // Don't fail signout if session deletion fails
        console.error("Failed to delete database session:", error)
      }
      
      // Log logout
      try {
        await logLogout(session.user.id)
      } catch (logError) {
        // Don't fail signout if logging fails
        console.error("Failed to log logout:", logError)
      }
    }
    
    // Sign out user (clears JWT)
    await signOut()
    
    // Revalidate users page to update login status immediately
    revalidatePath("/dashboard/users")
    revalidatePath("/dashboard/users", "page")
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Sign out failed" },
      { status: 500 }
    )
  }
}