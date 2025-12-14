import { signIn } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (!result) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Revalidate users page to update login status immediately
    revalidatePath("/dashboard/users")
    revalidatePath("/dashboard/users", "page")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Login error:", error)
    
    // Extract the error message from NextAuth error
    let errorMessage = "Authentication failed. Please try again"
    
    if (error instanceof Error) {
      // Check for specific NextAuth error messages
      if (error.message.includes("No user found")) {
        errorMessage = "No user found with this email address"
      } else if (error.message.includes("Incorrect password")) {
        errorMessage = "Incorrect password. Please try again"
      } else if (error.message.includes("deactivated")) {
        errorMessage = "Your account has been deactivated. Please contact support"
      } else if (error.message.includes("required")) {
        errorMessage = "Email and password are required"
      } else if (error.message.includes("CredentialsSignin")) {
        errorMessage = "Invalid credentials. Please check your email and password"
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
    )
  }
}
