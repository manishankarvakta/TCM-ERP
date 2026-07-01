import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeUnit } from "@/lib/ecommerce/dto";

// GET /api/ecommerce/units
export async function GET() {
  try {
    const units = await prisma.unit.findMany({
      where: {
        status: "active"
      },
      orderBy: {
        symbol: "asc"
      }
    });

    return NextResponse.json({
      success: true,
      units: units.map(serializeUnit)
    });

  } catch (error) {
    console.error("GET /api/ecommerce/units error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}
