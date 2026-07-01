import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeCategory } from "@/lib/ecommerce/dto";

// GET /api/ecommerce/categories/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Visibility constraint
    const visibilityFilter = { status: "active" };
    
    const countSelect = {
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
    };

    // 1. Try by ID
    let category = await prisma.category.findFirst({
      where: {
        id,
        ...visibilityFilter
      },
      include: countSelect
    });

    // 2. Try by Slug
    if (!category) {
      category = await prisma.category.findFirst({
        where: {
          slug: id,
          ...visibilityFilter
        },
        include: countSelect
      });
    }

    if (!category) {
      return NextResponse.json({
        success: false,
        message: "Category not found"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      category: serializeCategory(category)
    });

  } catch (error) {
    console.error("GET /api/ecommerce/categories/[id] error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}
