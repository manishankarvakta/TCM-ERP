import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeCategory } from "@/lib/ecommerce/dto";

// GET /api/ecommerce/categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        status: "active"
      },
      include: {
        _count: {
          select: {
            items: {
              where: {
                isEnableEcom: true,
                isTrash: false,
                status: "active"
              }
            }
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json({
      success: true,
      categories: categories.map(serializeCategory)
    });

  } catch (error) {
    console.error("GET /api/ecommerce/categories error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}
