import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.settings.findMany({
      where: { category: "backup_telegram", is_active: true },
      orderBy: { created_at: "desc" }
    });

    const configs = settings.map((s: any) => {
      const json = s.settings as any;
      return {
        id: s.id,
        name: json?.name || s.title,
        botToken: json?.botToken || "",
        chatId: json?.chatId || "",
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
    const { id, name, botToken, chatId, isActive } = body;

    // If setting active, deactivate others
    if (isActive) {
      const allTelegram = await prisma.settings.findMany({
        where: { category: "backup_telegram", is_active: true }
      });
      for (const t of allTelegram) {
        const json = t.settings as any;
        if (json && json.isActive) {
          await prisma.settings.update({
            where: { id: t.id },
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
            botToken,
            chatId,
            isActive
          }
        }
      });
    } else {
      // Create
      const newId = `telegram-config-${Date.now()}`;
      setting = await prisma.settings.create({
        data: {
          id: newId,
          title: name,
          code: newId,
          category: "backup_telegram",
          settings: {
            name,
            botToken,
            chatId,
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
      botToken: json.botToken,
      chatId: json.chatId,
      isActive: json.isActive,
      createdAt: setting.created_at
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
