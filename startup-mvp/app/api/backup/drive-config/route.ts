import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.settings.findMany({
      where: { category: "backup_drive", is_active: true },
      orderBy: { created_at: "desc" }
    });

    const configs = settings.map((s: any) => {
      const json = s.settings as any;
      return {
        id: s.id,
        name: json?.name || s.title,
        folderId: json?.folderId || "",
        serviceAccountJson: json?.serviceAccountJson || "",
        isActive: json?.isActive || false,
        createdAt: s.created_at,
      };
    });

    return NextResponse.json(configs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, folderId, serviceAccountJson, isActive } = body;

    // If setting active, deactivate others
    if (isActive) {
      const allDrive = await prisma.settings.findMany({
        where: { category: "backup_drive", is_active: true }
      });
      for (const d of allDrive) {
        const json = d.settings as any;
        if (json && json.isActive) {
          await prisma.settings.update({
            where: { id: d.id },
            data: {
              settings: {
                ...json,
                isActive: false
              }
            }
          });
        }
      }
    }

    let setting;
    if (id) {
      // Update
      setting = await prisma.settings.update({
        where: { id },
        data: {
          title: name,
          settings: {
            name,
            folderId,
            serviceAccountJson,
            isActive
          }
        }
      });
    } else {
      // Create
      const newId = `drive-config-${Date.now()}`;
      setting = await prisma.settings.create({
        data: {
          id: newId,
          title: name,
          code: newId,
          category: "backup_drive",
          settings: {
            name,
            folderId,
            serviceAccountJson,
            isActive
          },
          is_active: true,
          is_global: true,
        }
      });
    }

    const json = setting.settings as any;
    return NextResponse.json({
      id: setting.id,
      name: json.name,
      folderId: json.folderId,
      serviceAccountJson: json.serviceAccountJson,
      isActive: json.isActive,
      createdAt: setting.created_at
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
