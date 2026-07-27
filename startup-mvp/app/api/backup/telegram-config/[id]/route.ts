import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const config = await prisma.settings.findUnique({
      where: { id }
    });

    if (!config) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    await prisma.settings.delete({
      where: { id }
    });

    const json = config.settings as any;
    if (json && json.isActive) {
      const nextConfig = await prisma.settings.findFirst({
        where: { category: "backup_telegram", is_active: true }
      });
      if (nextConfig) {
        const nextJson = nextConfig.settings as any;
        await prisma.settings.update({
          where: { id: nextConfig.id },
          data: {
            settings: {
              ...nextJson,
              isActive: true
            }
          }
        });
      }
    }

    return NextResponse.json({ success: true, message: "Configuration deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
