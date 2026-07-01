import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProductCard, serializePagination } from "@/lib/ecommerce/dto";

// GET /api/ecommerce/products/search
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // Search query
    const q = searchParams.get("q");
    if (!q || !q.trim()) {
      return NextResponse.json({
        success: false,
        message: "Search query 'q' cannot be empty"
      }, { status: 400 });
    }
    const query = q.trim();

    // Filters
    const categoryId = searchParams.get("categoryId");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const color = searchParams.get("color");
    const size = searchParams.get("size");
    const sort = searchParams.get("sort") || "latest";

    // 1. Build where conditions
    const andConditions: any[] = [
      { isEnableEcom: true },
      { isTrash: false },
      { status: "active" },
      { itemType: "RETAIL" },
      {
        OR: [
          { categoryId: null },
          { category: { status: "active" } }
        ]
      },
      // Search logic (including variant SKU/barcode search)
      {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { barcode: { contains: query, mode: "insensitive" } },
          {
            variants: {
              some: {
                OR: [
                  { sku: { contains: query, mode: "insensitive" } },
                  { barcode: { contains: query, mode: "insensitive" } }
                ]
              }
            }
          }
        ]
      }
    ];

    if (categoryId) {
      andConditions.push({ categoryId });
    }

    if (minPrice || maxPrice) {
      const priceFilter: any = {};
      if (minPrice) priceFilter.gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.lte = parseFloat(maxPrice);
      andConditions.push({ salesPrice: priceFilter });
    }

    if (color && color.trim()) {
      andConditions.push({ colors: { has: color.trim() } });
    }

    if (size && size.trim()) {
      andConditions.push({ sizes: { has: size.trim() } });
    }

    const where = { AND: andConditions };

    // 2. Build sorting
    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") {
      orderBy = { salesPrice: "asc" };
    } else if (sort === "price_desc") {
      orderBy = { salesPrice: "desc" };
    } else if (sort === "name_asc") {
      orderBy = { name: "asc" };
    } else if (sort === "name_desc") {
      orderBy = { name: "desc" };
    }

    // 3. Query Database
    const [products, total] = await prisma.$transaction([
      prisma.item.findMany({
        where,
        include: {
          category: true,
          unit: true,
          stocks: true,
          variants: {
            include: {
              stocks: true
            }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.item.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: products.map(serializeProductCard),
      pagination: serializePagination(page, limit, total)
    });

  } catch (error) {
    console.error("GET /api/ecommerce/products/search error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}
