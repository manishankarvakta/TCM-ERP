/**
 * Seed Bangladesh National Holidays
 *
 * Seeds all gazetted national/public holidays for Bangladesh for 2025 and 2026.
 * Includes both fixed-date holidays and approximate Islamic/lunar holidays.
 *
 * Islamic holidays (Eid, Shab-e-Barat, etc.) shift ~10-11 days earlier each year.
 * Dates used below are the officially observed/gazette dates.
 *
 * Run: npx tsx prisma/seed-holidays-bangladesh.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Holiday definitions
// ---------------------------------------------------------------------------

interface HolidayDef {
  name: string;
  date: string; // YYYY-MM-DD
  type: "national" | "islamic" | "religious" | "cultural";
}

const HOLIDAYS_2025: HolidayDef[] = [
  // ── Fixed Gregorian National Holidays ──────────────────────────────────
  { name: "New Year's Day",                         date: "2025-01-01", type: "national"  },
  { name: "International Mother Language Day",       date: "2025-02-21", type: "national"  },
  { name: "National Day (Independence Day)",          date: "2026-03-26", type: "national"  }, // Will be in 2026 block too
  { name: "May Day (International Labour Day)",      date: "2025-05-01", type: "national"  },
  { name: "National Mourning Day",                   date: "2025-08-15", type: "national"  },
  { name: "Victory Day",                             date: "2025-12-16", type: "national"  },

  // ── Islamic / Lunar Holidays (2025 approximate gazette dates) ──────────
  { name: "Shab-e-Barat",                           date: "2025-02-13", type: "islamic"   },
  { name: "Eid-ul-Fitr Day 1",                      date: "2025-03-31", type: "islamic"   },
  { name: "Eid-ul-Fitr Day 2",                      date: "2025-04-01", type: "islamic"   },
  { name: "Eid-ul-Fitr Day 3",                      date: "2025-04-02", type: "islamic"   },
  { name: "Eid-ul-Adha Day 1",                      date: "2025-06-07", type: "islamic"   },
  { name: "Eid-ul-Adha Day 2",                      date: "2025-06-08", type: "islamic"   },
  { name: "Eid-ul-Adha Day 3",                      date: "2025-06-09", type: "islamic"   },
  { name: "Ashura (Muharram)",                       date: "2025-07-06", type: "islamic"   },
  { name: "Eid-e-Milad-un-Nabi (Prophet's Birthday)",date: "2025-09-05", type: "islamic"   },
  { name: "Shab-e-Qadr",                            date: "2025-03-28", type: "islamic"   },

  // ── Hindu Religious Holidays ────────────────────────────────────────────
  { name: "Saraswati Puja",                         date: "2025-02-02", type: "religious" },
  { name: "Dol Jatra (Holi)",                       date: "2025-03-14", type: "religious" },
  { name: "Durga Puja (Bijaya Dashami)",             date: "2025-10-02", type: "religious" },
  { name: "Laxmi Puja",                             date: "2025-10-07", type: "religious" },
  { name: "Kali Puja",                              date: "2025-10-20", type: "religious" },

  // ── Buddhist Holidays ───────────────────────────────────────────────────
  { name: "Buddha Purnima",                         date: "2025-05-12", type: "religious" },

  // ── Christian Holidays ──────────────────────────────────────────────────
  { name: "Good Friday",                            date: "2025-04-18", type: "religious" },
  { name: "Easter Sunday",                          date: "2025-04-20", type: "religious" },
  { name: "Christmas Day",                          date: "2025-12-25", type: "religious" },

  // ── Cultural / National ─────────────────────────────────────────────────
  { name: "Pahela Baishakh (Bengali New Year)",     date: "2025-04-14", type: "cultural"  },
  { name: "Pahela Falgun (Spring Festival)",        date: "2025-02-13", type: "cultural"  },
  { name: "Shaheed Dibosh (Martyrs' Day) – 7 March", date: "2025-03-07", type: "national" },
];

const HOLIDAYS_2026: HolidayDef[] = [
  // ── Fixed Gregorian National Holidays ──────────────────────────────────
  { name: "New Year's Day",                         date: "2026-01-01", type: "national"  },
  { name: "International Mother Language Day",       date: "2026-02-21", type: "national"  },
  { name: "National Day (Independence Day)",          date: "2026-03-26", type: "national"  },
  { name: "May Day (International Labour Day)",      date: "2026-05-01", type: "national"  },
  { name: "National Mourning Day",                   date: "2026-08-15", type: "national"  },
  { name: "Victory Day",                             date: "2026-12-16", type: "national"  },

  // ── Islamic / Lunar Holidays (2026 approximate gazette dates) ──────────
  { name: "Shab-e-Barat",                           date: "2026-02-02", type: "islamic"   },
  { name: "Eid-ul-Fitr Day 1",                      date: "2026-03-20", type: "islamic"   },
  { name: "Eid-ul-Fitr Day 2",                      date: "2026-03-21", type: "islamic"   },
  { name: "Eid-ul-Fitr Day 3",                      date: "2026-03-22", type: "islamic"   },
  { name: "Eid-ul-Adha Day 1",                      date: "2026-05-27", type: "islamic"   },
  { name: "Eid-ul-Adha Day 2",                      date: "2026-05-28", type: "islamic"   },
  { name: "Eid-ul-Adha Day 3",                      date: "2026-05-29", type: "islamic"   },
  { name: "Ashura (Muharram)",                       date: "2026-06-25", type: "islamic"   },
  { name: "Eid-e-Milad-un-Nabi (Prophet's Birthday)",date: "2026-08-25", type: "islamic"   },
  { name: "Shab-e-Qadr",                            date: "2026-03-17", type: "islamic"   },

  // ── Hindu Religious Holidays ────────────────────────────────────────────
  { name: "Saraswati Puja",                         date: "2026-01-22", type: "religious" },
  { name: "Dol Jatra (Holi)",                       date: "2026-03-03", type: "religious" },
  { name: "Durga Puja (Bijaya Dashami)",             date: "2026-10-21", type: "religious" },
  { name: "Laxmi Puja",                             date: "2026-10-26", type: "religious" },
  { name: "Kali Puja",                              date: "2026-11-08", type: "religious" },

  // ── Buddhist Holidays ───────────────────────────────────────────────────
  { name: "Buddha Purnima",                         date: "2026-05-01", type: "religious" },

  // ── Christian Holidays ──────────────────────────────────────────────────
  { name: "Good Friday",                            date: "2026-04-03", type: "religious" },
  { name: "Easter Sunday",                          date: "2026-04-05", type: "religious" },
  { name: "Christmas Day",                          date: "2026-12-25", type: "religious" },

  // ── Cultural / National ─────────────────────────────────────────────────
  { name: "Pahela Baishakh (Bengali New Year)",     date: "2026-04-14", type: "cultural"  },
  { name: "Pahela Falgun (Spring Festival)",        date: "2026-02-13", type: "cultural"  },
  { name: "Shaheed Dibosh (Martyrs' Day) – 7 March", date: "2026-03-07", type: "national" },
];

const ALL_HOLIDAYS: HolidayDef[] = [...HOLIDAYS_2025, ...HOLIDAYS_2026];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding Bangladesh national holidays...\n");

  // Find admin user as creator
  const creator =
    (await prisma.user.findFirst({
      where: { role: "admin", status: "active" },
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.user.findFirst({
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    }));

  if (!creator) {
    throw new Error("No users found in DB. Create an admin user first, then re-run this seed.");
  }

  console.log(`👤 Using creator: ${creator.email ?? creator.id}\n`);

  let created = 0;
  let skipped = 0;

  const typeEmoji: Record<string, string> = {
    national:  "🇧🇩",
    islamic:   "🌙",
    religious: "🙏",
    cultural:  "🎨",
  };

  for (const holiday of ALL_HOLIDAYS) {
    const date = new Date(holiday.date);

    // Check if a holiday with the same name and date already exists
    const existing = await prisma.holiday.findFirst({
      where: {
        name: holiday.name,
        date: {
          gte: new Date(`${holiday.date}T00:00:00.000Z`),
          lte: new Date(`${holiday.date}T23:59:59.999Z`),
        },
      },
    });

    if (existing) {
      console.log(`  ⏭️  Skip  ${holiday.date}  ${holiday.name} (already exists)`);
      skipped++;
      continue;
    }

    await prisma.holiday.create({
      data: {
        name:      holiday.name,
        date,
        status:    "active",
        isTrash:   false,
        createdBy: creator.id,
      },
    });

    const emoji = typeEmoji[holiday.type] ?? "📅";
    console.log(`  ${emoji}  Added  ${holiday.date}  ${holiday.name}`);
    created++;
  }

  console.log(`\n✅ Done!`);
  console.log(`   Created : ${created}`);
  console.log(`   Skipped : ${skipped} (already existed)`);
  console.log(`   Total   : ${ALL_HOLIDAYS.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding holidays:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
