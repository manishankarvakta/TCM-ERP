import { signIn } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

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
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    )
  }
}
