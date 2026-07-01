import { NextResponse } from "next/server";
import { getClientFromRequest, sanitizeClient } from "@/lib/ecommerce/client-auth";

export async function GET(req: Request) {
  try {
    const client = await getClientFromRequest(req);
    
    if (!client) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized"
      }, { status: 401 });
    }

    const sanitized = sanitizeClient(client);

    return NextResponse.json({
      success: true,
      client: sanitized
    });
  } catch (error) {
    console.error("E-commerce /auth/me API error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal Server Error"
    }, { status: 500 });
  }
}
