/**
 * Seed Full 2026 Holidays — Bangladesh National + International Observance Days
 *
 * Covers:
 *   🇧🇩 Bangladesh gazetted national / public holidays
 *   🌙 Islamic lunar holidays (2026 gazette-approximate dates)
 *   🙏 Hindu / Buddhist / Christian religious holidays
 *   🌍 UN / WHO / UNESCO international observance days (full year)
 *
 * Safe to re-run — skips any holiday already in the DB for the same date + name.
 *
 * Run: npx tsx prisma/seed-holidays-2026-full.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface HolidayDef {
  name: string;
  date: string; // YYYY-MM-DD
  category: "national" | "islamic" | "religious" | "cultural" | "international";
}

// ============================================================================
// 2026 HOLIDAY LIST
// ============================================================================

const HOLIDAYS_2026: HolidayDef[] = [

  // ==========================================================================
  // JANUARY 2026
  // ==========================================================================
  { name: "New Year's Day",                                        date: "2026-01-01", category: "national"      },
  { name: "World Braille Day",                                     date: "2026-01-04", category: "international"  },
  { name: "World Hindi Day",                                       date: "2026-01-10", category: "international"  },
  { name: "Saraswati Puja",                                        date: "2026-01-22", category: "religious"      },
  { name: "International Education Day",                           date: "2026-01-24", category: "international"  },
  { name: "International Holocaust Remembrance Day",               date: "2026-01-27", category: "international"  },

  // ==========================================================================
  // FEBRUARY 2026
  // ==========================================================================
  { name: "World Wetlands Day",                                    date: "2026-02-02", category: "international"  },
  { name: "Shab-e-Barat",                                         date: "2026-02-02", category: "islamic"        },
  { name: "World Cancer Day",                                      date: "2026-02-04", category: "international"  },
  { name: "International Day of Zero Tolerance for FGM",          date: "2026-02-06", category: "international"  },
  { name: "International Day of Women and Girls in Science",       date: "2026-02-11", category: "international"  },
  { name: "World Radio Day",                                       date: "2026-02-13", category: "international"  },
  { name: "Pahela Falgun (First Day of Spring / Spring Festival)", date: "2026-02-13", category: "cultural"       },
  { name: "World Day of Social Justice",                          date: "2026-02-20", category: "international"  },
  { name: "International Mother Language Day (Ekushey February)", date: "2026-02-21", category: "national"       },
  { name: "Rare Disease Day",                                      date: "2026-02-28", category: "international"  },

  // ==========================================================================
  // MARCH 2026
  // ==========================================================================
  { name: "Zero Discrimination Day",                               date: "2026-03-01", category: "international"  },
  { name: "World Wildlife Day",                                    date: "2026-03-03", category: "international"  },
  { name: "Dol Jatra (Holi / Festival of Colors)",                date: "2026-03-03", category: "religious"      },
  { name: "Shaheed Dibosh — Historic Speech of 7 March",          date: "2026-03-07", category: "national"       },
  { name: "International Women's Day",                             date: "2026-03-08", category: "international"  },
  { name: "Shab-e-Qadr (Night of Power)",                         date: "2026-03-17", category: "islamic"        },
  { name: "Eid-ul-Fitr Day 1",                                    date: "2026-03-20", category: "islamic"        },
  { name: "Eid-ul-Fitr Day 2",                                    date: "2026-03-21", category: "islamic"        },
  { name: "International Day for the Elimination of Racial Discrimination", date: "2026-03-21", category: "international" },
  { name: "Eid-ul-Fitr Day 3",                                    date: "2026-03-22", category: "islamic"        },
  { name: "World Water Day",                                       date: "2026-03-22", category: "international"  },
  { name: "World Meteorological Day",                              date: "2026-03-23", category: "international"  },
  { name: "World Tuberculosis Day",                                date: "2026-03-24", category: "international"  },
  { name: "National Day (Independence Day)",                       date: "2026-03-26", category: "national"       },
  { name: "World Theatre Day",                                     date: "2026-03-27", category: "international"  },

  // ==========================================================================
  // APRIL 2026
  // ==========================================================================
  { name: "World Autism Awareness Day",                            date: "2026-04-02", category: "international"  },
  { name: "Good Friday",                                           date: "2026-04-03", category: "religious"      },
  { name: "International Day for Mine Awareness and Assistance in Mine Action", date: "2026-04-04", category: "international" },
  { name: "Easter Sunday",                                         date: "2026-04-05", category: "religious"      },
  { name: "World Health Day",                                      date: "2026-04-07", category: "international"  },
  { name: "Pahela Baishakh (Bengali New Year 1433)",               date: "2026-04-14", category: "cultural"       },
  { name: "Earth Day",                                             date: "2026-04-22", category: "international"  },
  { name: "World Book and Copyright Day",                          date: "2026-04-23", category: "international"  },
  { name: "World Malaria Day",                                     date: "2026-04-25", category: "international"  },
  { name: "World Intellectual Property Day",                       date: "2026-04-26", category: "international"  },

  // ==========================================================================
  // MAY 2026
  // ==========================================================================
  { name: "May Day (International Labour Day)",                    date: "2026-05-01", category: "national"       },
  { name: "Buddha Purnima (Vesak)",                                date: "2026-05-01", category: "religious"      },
  { name: "World Press Freedom Day",                               date: "2026-05-03", category: "international"  },
  { name: "World Red Cross and Red Crescent Day",                  date: "2026-05-08", category: "international"  },
  { name: "World Migratory Bird Day",                              date: "2026-05-09", category: "international"  },
  { name: "International Day of Families",                         date: "2026-05-15", category: "international"  },
  { name: "World Telecommunication and Information Society Day",   date: "2026-05-17", category: "international"  },
  { name: "International Museum Day",                              date: "2026-05-18", category: "international"  },
  { name: "World Bee Day",                                         date: "2026-05-20", category: "international"  },
  { name: "International Day for Biological Diversity",            date: "2026-05-22", category: "international"  },
  { name: "Eid-ul-Adha Day 1",                                    date: "2026-05-27", category: "islamic"        },
  { name: "Eid-ul-Adha Day 2",                                    date: "2026-05-28", category: "islamic"        },
  { name: "Eid-ul-Adha Day 3",                                    date: "2026-05-29", category: "islamic"        },
  { name: "World No-Tobacco Day",                                  date: "2026-05-31", category: "international"  },

  // ==========================================================================
  // JUNE 2026
  // ==========================================================================
  { name: "Global Day of Parents",                                 date: "2026-06-01", category: "international"  },
  { name: "International Day of Innocent Children Victims of Aggression", date: "2026-06-04", category: "international" },
  { name: "World Environment Day",                                 date: "2026-06-05", category: "international"  },
  { name: "World Food Safety Day",                                 date: "2026-06-07", category: "international"  },
  { name: "World Oceans Day",                                      date: "2026-06-08", category: "international"  },
  { name: "World Day Against Child Labour",                        date: "2026-06-12", category: "international"  },
  { name: "World Blood Donor Day",                                 date: "2026-06-14", category: "international"  },
  { name: "World Elder Abuse Awareness Day",                       date: "2026-06-15", category: "international"  },
  { name: "International Day of the African Child",                date: "2026-06-16", category: "international"  },
  { name: "World Day to Combat Desertification and Drought",       date: "2026-06-17", category: "international"  },
  { name: "World Refugee Day",                                     date: "2026-06-20", category: "international"  },
  { name: "International Day of Yoga",                             date: "2026-06-21", category: "international"  },
  { name: "Ashura (Muharram / Martyrdom of Imam Hussain)",        date: "2026-06-25", category: "islamic"        },
  { name: "United Nations Public Service Day",                     date: "2026-06-23", category: "international"  },
  { name: "International Day Against Drug Abuse and Illicit Trafficking", date: "2026-06-26", category: "international" },

  // ==========================================================================
  // JULY 2026
  // ==========================================================================
  { name: "World Population Day",                                  date: "2026-07-11", category: "international"  },
  { name: "World Youth Skills Day",                                date: "2026-07-15", category: "international"  },
  { name: "Nelson Mandela International Day",                      date: "2026-07-18", category: "international"  },
  { name: "World Drowning Prevention Day",                         date: "2026-07-25", category: "international"  },
  { name: "International Day for the Conservation of the Mangrove Ecosystem", date: "2026-07-26", category: "international" },
  { name: "World Hepatitis Day",                                   date: "2026-07-28", category: "international"  },
  { name: "World Day Against Trafficking in Persons",              date: "2026-07-30", category: "international"  },

  // ==========================================================================
  // AUGUST 2026
  // ==========================================================================
  { name: "International Day of the World's Indigenous Peoples",   date: "2026-08-09", category: "international"  },
  { name: "International Youth Day",                               date: "2026-08-12", category: "international"  },
  { name: "National Mourning Day (Jatiya Shok Dibosh)",           date: "2026-08-15", category: "national"       },
  { name: "World Humanitarian Day",                                date: "2026-08-19", category: "international"  },
  { name: "International Day for the Remembrance of the Slave Trade", date: "2026-08-23", category: "international" },
  { name: "Eid-e-Milad-un-Nabi (Prophet Muhammad's Birthday)",    date: "2026-08-25", category: "islamic"        },

  // ==========================================================================
  // SEPTEMBER 2026
  // ==========================================================================
  { name: "International Day of Charity",                          date: "2026-09-05", category: "international"  },
  { name: "International Literacy Day",                            date: "2026-09-08", category: "international"  },
  { name: "World Suicide Prevention Day",                          date: "2026-09-10", category: "international"  },
  { name: "International Day for the Preservation of the Ozone Layer", date: "2026-09-16", category: "international" },
  { name: "International Day of Peace",                            date: "2026-09-21", category: "international"  },
  { name: "World Rivers Day",                                      date: "2026-09-27", category: "international"  },
  { name: "World Rabies Day",                                      date: "2026-09-28", category: "international"  },
  { name: "World Heart Day",                                       date: "2026-09-29", category: "international"  },

  // ==========================================================================
  // OCTOBER 2026
  // ==========================================================================
  { name: "International Day of Older Persons",                    date: "2026-10-01", category: "international"  },
  { name: "International Day of Non-Violence",                     date: "2026-10-02", category: "international"  },
  { name: "World Habitat Day",                                     date: "2026-10-05", category: "international"  },
  { name: "World Teachers' Day",                                   date: "2026-10-05", category: "international"  },
  { name: "World Mental Health Day",                               date: "2026-10-10", category: "international"  },
  { name: "International Day of the Girl Child",                   date: "2026-10-11", category: "international"  },
  { name: "International Day for Disaster Risk Reduction",         date: "2026-10-13", category: "international"  },
  { name: "International Day of Rural Women",                      date: "2026-10-15", category: "international"  },
  { name: "World Food Day",                                        date: "2026-10-16", category: "international"  },
  { name: "International Day for the Eradication of Poverty",     date: "2026-10-17", category: "international"  },
  { name: "Durga Puja — Bijaya Dashami",                          date: "2026-10-21", category: "religious"      },
  { name: "United Nations Day",                                    date: "2026-10-24", category: "international"  },
  { name: "Laxmi Puja",                                           date: "2026-10-26", category: "religious"      },
  { name: "World Cities Day",                                      date: "2026-10-31", category: "international"  },

  // ==========================================================================
  // NOVEMBER 2026
  // ==========================================================================
  { name: "World Tsunami Awareness Day",                           date: "2026-11-05", category: "international"  },
  { name: "International Day for Preventing Exploitation of the Environment in War", date: "2026-11-06", category: "international" },
  { name: "Kali Puja",                                            date: "2026-11-08", category: "religious"      },
  { name: "World Science Day for Peace and Development",           date: "2026-11-10", category: "international"  },
  { name: "World Diabetes Day",                                    date: "2026-11-14", category: "international"  },
  { name: "International Day for Tolerance",                       date: "2026-11-16", category: "international"  },
  { name: "World Toilet Day",                                      date: "2026-11-19", category: "international"  },
  { name: "Universal Children's Day",                              date: "2026-11-20", category: "international"  },
  { name: "International Day for the Elimination of Violence against Women", date: "2026-11-25", category: "international" },
  { name: "World Sustainable Transport Day",                       date: "2026-11-26", category: "international"  },
  { name: "World Cities Forum Day",                                date: "2026-11-27", category: "international"  },

  // ==========================================================================
  // DECEMBER 2026
  // ==========================================================================
  { name: "World AIDS Day",                                        date: "2026-12-01", category: "international"  },
  { name: "International Day for the Abolition of Slavery",        date: "2026-12-02", category: "international"  },
  { name: "International Day of Persons with Disabilities",        date: "2026-12-03", category: "international"  },
  { name: "World Soil Day",                                        date: "2026-12-05", category: "international"  },
  { name: "International Anti-Corruption Day",                     date: "2026-12-09", category: "international"  },
  { name: "Human Rights Day",                                      date: "2026-12-10", category: "international"  },
  { name: "International Mountain Day",                            date: "2026-12-11", category: "international"  },
  { name: "Victory Day (Bijoy Dibosh)",                           date: "2026-12-16", category: "national"       },
  { name: "International Migrants Day",                            date: "2026-12-18", category: "international"  },
  { name: "International Human Solidarity Day",                    date: "2026-12-20", category: "international"  },
  { name: "Christmas Day",                                         date: "2026-12-25", category: "religious"      },
];

// ============================================================================
// RUNNER
// ============================================================================

const EMOJI: Record<string, string> = {
  national:     "🇧🇩",
  islamic:      "🌙",
  religious:    "🙏",
  cultural:     "🎨",
  international: "🌍",
};

const CATEGORY_LABEL: Record<string, string> = {
  national:     "National",
  islamic:      "Islamic",
  religious:    "Religious",
  cultural:     "Cultural",
  international: "International",
};

async function main() {
  console.log("🌱 Seeding full 2026 holidays (Bangladesh National + International)...\n");

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
    throw new Error("No users found. Create an admin user first.");
  }

  console.log(`👤 Creator : ${creator.email ?? creator.id}`);
  console.log(`📆 Year    : 2026`);
  console.log(`📋 Total   : ${HOLIDAYS_2026.length} holidays to process\n`);

  const stats: Record<string, { created: number; skipped: number }> = {
    national:     { created: 0, skipped: 0 },
    islamic:      { created: 0, skipped: 0 },
    religious:    { created: 0, skipped: 0 },
    cultural:     { created: 0, skipped: 0 },
    international:{ created: 0, skipped: 0 },
  };

  let currentMonth = "";

  for (const h of HOLIDAYS_2026) {
    const month = h.date.slice(0, 7); // YYYY-MM
    if (month !== currentMonth) {
      currentMonth = month;
      const d = new Date(h.date);
      console.log(`\n── ${d.toLocaleString("en-US", { month: "long" })} 2026 ──`);
    }

    // Skip if already exists (same name + same date)
    const existing = await prisma.holiday.findFirst({
      where: {
        name: h.name,
        date: {
          gte: new Date(`${h.date}T00:00:00.000Z`),
          lte: new Date(`${h.date}T23:59:59.999Z`),
        },
      },
    });

    const emoji = EMOJI[h.category] ?? "📅";

    if (existing) {
      console.log(`  ⏭️  ${h.date}  ${emoji} ${h.name} — already exists`);
      stats[h.category].skipped++;
      continue;
    }

    await prisma.holiday.create({
      data: {
        name:      h.name,
        date:      new Date(h.date),
        status:    "active",
        isTrash:   false,
        createdBy: creator.id,
      },
    });

    console.log(`  ✅  ${h.date}  ${emoji} ${h.name}`);
    stats[h.category].created++;
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n");
  console.log("═══════════════════════════════════════════");
  console.log("  2026 HOLIDAY SEED — SUMMARY");
  console.log("═══════════════════════════════════════════");

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const [cat, s] of Object.entries(stats)) {
    const emoji = EMOJI[cat];
    const label = CATEGORY_LABEL[cat].padEnd(15);
    if (s.created > 0 || s.skipped > 0) {
      console.log(`  ${emoji}  ${label} Created: ${String(s.created).padStart(3)}   Skipped: ${String(s.skipped).padStart(3)}`);
    }
    totalCreated += s.created;
    totalSkipped += s.skipped;
  }

  console.log("───────────────────────────────────────────");
  console.log(`     ${"TOTAL".padEnd(15)} Created: ${String(totalCreated).padStart(3)}   Skipped: ${String(totalSkipped).padStart(3)}`);
  console.log("═══════════════════════════════════════════\n");

  const totalInDB = await prisma.holiday.count({
    where: {
      date: { gte: new Date("2026-01-01"), lte: new Date("2026-12-31") },
      isTrash: false,
    },
  });
  console.log(`🗓️  Total 2026 holidays now in database: ${totalInDB}\n`);
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
