import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProductDetail } from "@/lib/ecommerce/dto";

// GET /api/ecommerce/products/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Build visibility filters
    const visibilityFilter: any = {
      isEnableEcom: true,
      isTrash: false,
      status: "active",
      itemType: "RETAIL",
      OR: [
        { categoryId: null },
        { category: { status: "active" } }
      ]
    };

    const includeRelations = {
      category: true,
      unit: true,
      stocks: true,
      variants: {
        include: {
          stocks: true
        }
      }
    };

    // 1. Try finding by ID
    let item = await prisma.item.findFirst({
      where: {
        id,
        ...visibilityFilter
      },
      include: includeRelations
    });

    // 2. Try finding by Slug
    if (!item) {
      item = await prisma.item.findFirst({
        where: {
          slug: id,
          ...visibilityFilter
        },
        include: includeRelations
      });
    }

    // 3. Try finding by Code
    if (!item) {
      item = await prisma.item.findFirst({
        where: {
          code: id,
          ...visibilityFilter
        },
        include: includeRelations
      });
    }

    if (!item) {
      return NextResponse.json({
        success: false,
        message: "Product not found"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: serializeProductDetail(item)
    });

  } catch (error) {
    console.error("GET /api/ecommerce/products/[id] error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}
