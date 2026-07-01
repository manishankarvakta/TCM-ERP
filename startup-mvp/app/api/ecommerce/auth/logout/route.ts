import { NextResponse } from "next/server";

export async function POST() {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    // Clear cookie by setting max-age to 0 and expiring it immediately
    const serializedCookie = `ecom_client_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${isProduction ? "; Secure" : ""}`;

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully"
    });

    response.headers.append("Set-Cookie", serializedCookie);
    return response;
  } catch (error) {
    console.error("E-commerce logout API error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal Server Error"
    }, { status: 500 });
  }
}
