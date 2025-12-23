import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to parse SQL date format "2025-12-17 22:44:39.566" to ISO
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr === "\\N" || dateStr.trim() === "") return null;
  // Convert "2025-12-17 22:44:39.566" to ISO format
  return new Date(dateStr.replace(" ", "T") + "Z");
}

// Helper function to parse description (remove quotes if present)
function parseDescription(desc: string | null): string | null {
  if (!desc || desc === "\\N" || desc.trim() === "") return null;
  // Remove surrounding quotes if present
  return desc.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Module Groups");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const moduleGroups = [
      {
        id: "cmjalmyod00eno0016w66t11s",
        code: "ES-x",
        description: parseDescription('"Kitchen Top Solid Surface:\n100% Pure Acrylic Solid Surface\nThickness -12mm\nAs per drawing"'),
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:44:39.566")!,
        updatedAt: parseDate("2025-12-17 22:44:39.566")!,
      },
      {
        id: "cmjalnsr000euo001ngdjfh3r",
        code: "ES-Solid Surface Support",
        description: "24 mm Board Support Under Solid Surface ",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:45:18.54")!,
        updatedAt: parseDate("2025-12-17 22:45:18.54")!,
      },
      {
        id: "cmjalop3j00f1o001cmmdprf2",
        code: "ES-604-65",
        description: "(Silicon IP 65) Under Cabinet  LINEAR LED \nLIGHT_Color-Warm",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:46:00.464")!,
        updatedAt: parseDate("2025-12-17 22:46:00.464")!,
      },
      {
        id: "cmjalphuj00f8o001by22akma",
        code: "ES-606-24",
        description: "Driver 24W DRIVER+PLUG,match for \nitem LED LINEAR LIGHT20W",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:46:37.723")!,
        updatedAt: parseDate("2025-12-17 22:46:37.723")!,
      },
      {
        id: "cmjalq37x00ffo0016s96se8t",
        code: "ES-610-24",
        description: "Sensor head,match for item LED LINEAR LIGHT",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:47:05.421")!,
        updatedAt: parseDate("2025-12-17 22:47:05.421")!,
      },
      {
        id: "cmjalqtt600fmo001jollthav",
        code: "ES-609-LED",
        description: "U pvc channel for IP65",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:47:39.883")!,
        updatedAt: parseDate("2025-12-17 22:47:39.883")!,
      },
      {
        id: "cmjaf81w20012o001jlrt58f6",
        code: "ES-BTC-WPW",
        description: "Carcase materials:  Made by 16mm waterproof melamine plywood with 1 mm PVC edge banding , Back ply 6 mm waterproof melamine plywood Colour & Finish: Warm white, semi matte,",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 19:45:06.195")!,
        updatedAt: parseDate("2025-12-17 22:01:36.824")!,
      },
      {
        id: "cmjakvk86007lo0018wtl4lbh",
        code: "ES-WC-WPW",
        description: "Carcase materials:  Made by 16mm waterproof melamine plywood with 1 mm PVC edge banding , Back ply 6 mm waterproof melamine plywood Colour & Finish: Warm white, semi matte,",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:23:21.125")!,
        updatedAt: parseDate("2025-12-17 22:27:29.13")!,
      },
      {
        id: "cmjal32xa00aro001nm115n60",
        code: "ES-Base+Upper Frame",
        description: "Supply of Custom Made Modular Cabinet knockdown system body, Made by 16mm thick  waterproof melamine plywood with double faced warm white as approved drawing, including all imported hardware, without accessories",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:29:11.95")!,
        updatedAt: parseDate("2025-12-17 22:29:11.95")!,
      },
      {
        id: "cmjal40fd00ayo001os0qn395",
        code: "ES-BC-WPW",
        description: "Supply of Custom Made Modular Cabinet knockdown system body, Made by 16 mm thick  waterproof melamine plywood with double faced warm white as approved drawing",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:29:55.369")!,
        updatedAt: parseDate("2025-12-17 22:29:55.369")!,
      },
      {
        id: "cmjal5pew00b5o001yo0ve8cn",
        code: "Base Shutter:  ES. HPL ",
        description: parseDescription('"Door/ side panel: Material:Made by 18mm thick plywood, \nBackside finish : melamine/HPL\nFront side/ surface: UV / HPL\nFinish: high gloss/matte with  with matching/ contrast edge banding."'),
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:31:14.408")!,
        updatedAt: parseDate("2025-12-17 22:31:14.408")!,
      },
      {
        id: "cmjal7j2e00bco0013eo5p8b7",
        code: "Upper Shutter  ES. HPL ",
        description: "Door/ side panel: Material:Made by 18mm thick plywood, \nBackside finish : melamine/HPL\nFront side/ surface: UV / HPL\nFinish: high gloss/matte with  with matching/ contrast edge banding.",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:32:39.494")!,
        updatedAt: parseDate("2025-12-17 22:32:39.494")!,
      },
      {
        id: "cmjal9c5a00bjo00148a17ts8",
        code: "Base+Tall & Top of Tall  Shutter",
        description: "Door/ side panel: Material:Made by 18mm thick moistureproof Green MDF-E1 ,/ partical/ plywood, \nBackside finish",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:34:03.838")!,
        updatedAt: parseDate("2025-12-17 22:34:03.838")!,
      },
      {
        id: "cmjaladv000bqo0016jywzh3n",
        code: "Base Shutter  ",
        description: "Door/ side panel: Material:Made by 18mm thick moistureproof Green MDF-E1 ,/ partical/ plywood, \n",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:34:52.716")!,
        updatedAt: parseDate("2025-12-17 22:34:52.716")!,
      },
      {
        id: "cmjalbesw00bxo001dprc4ao4",
        code: "Frame+Handle ES.302(B)",
        description: "5mm Coffee Color Glass Shatter with Narrow Profile Aluminum Frame ",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:35:40.592")!,
        updatedAt: parseDate("2025-12-17 22:35:40.592")!,
      },
      {
        id: "cmjalch9e00c4o001pw1fh9zr",
        code: "ES-Glass Shelf",
        description: "10mm Clear Transparent Glass Shelf",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:36:30.435")!,
        updatedAt: parseDate("2025-12-17 22:36:30.435")!,
      },
      {
        id: "cmjaldr4i00cbo0012pwuwd3b",
        code: "ES-PO-100",
        description: "Tip on / Push to open (Glass Shutter)",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:37:29.875")!,
        updatedAt: parseDate("2025-12-17 22:37:29.875")!,
      },
      {
        id: "cmjalejmr00cio001lcb45gps",
        code: "ES-PO-101",
        description: "Tip on / Push to open ",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:38:06.82")!,
        updatedAt: parseDate("2025-12-17 22:38:06.82")!,
      },
      {
        id: "cmjalfg4k00cpo001bb3xpq4n",
        code: "ES-FLR-50/75/100mm",
        description: "Filler",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:38:48.932")!,
        updatedAt: parseDate("2025-12-17 22:38:48.932")!,
      },
      {
        id: "cmjalh37z00cwo001fjo3bw5e",
        code: "ES-101 (S)",
        description: "Handle: Grip profile (Silver)",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:40:05.519")!,
        updatedAt: parseDate("2025-12-17 22:40:05.519")!,
      },
      {
        id: "cmjalhl2o00d3o001dqahsrx6",
        code: "ES-209-DS",
        description: "concealed hinge , Full ovarlay with MK logo, Chrome finish.all accessories, SS304, soft close hinge, clip-on, 2D,with arm cover and cup cover and screws and dowel, 1pc/bag,10pcs/inner box, 100pcs/ctn; 304",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:40:28.656")!,
        updatedAt: parseDate("2025-12-17 22:40:28.656")!,
      },
      {
        id: "cmjali23b00dao00158m7brvb",
        code: "ES-109-PA",
        description: "concealed hinge , Full ovarlay with MK logo, Chrome finish. , , aluminum hinge, clip-on, 3D,with arm cover and screws,",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:40:50.711")!,
        updatedAt: parseDate("2025-12-17 22:40:50.711")!,
      },
      {
        id: "cmjalihz700dho001yme9dnfb",
        code: "ES-003-CH",
        description: "Hinge: Tiomos 110 AL Full Overlay110° opening angle",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:41:11.299")!,
        updatedAt: parseDate("2025-12-17 22:41:11.299")!,
      },
      {
        id: "cmjalizk700doo001fuef5e2q",
        code: "ES-005-CH",
        description: "Adjustable Hanging hook",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:41:34.087")!,
        updatedAt: parseDate("2025-12-17 22:41:34.087")!,
      },
      {
        id: "cmjaljkqi00dvo0013c7pt03d",
        code: "ES-006-CH",
        description: "Adjustable ABS legs with clip",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:42:01.53")!,
        updatedAt: parseDate("2025-12-17 22:42:01.53")!,
      },
      {
        id: "cmjalkmr700e2o001dujxz9nk",
        code: "ES-601-CH",
        description: "Skirting : PVC , Finish: Silver",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:42:50.803")!,
        updatedAt: parseDate("2025-12-17 22:42:50.803")!,
      },
      {
        id: "cmjallc1e00e9o001p5dnrq2c",
        code: "ES-602-CH",
        description: "Skirting : PVC , Finish: Black",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:43:23.57")!,
        updatedAt: parseDate("2025-12-17 22:43:23.57")!,
      },
      {
        id: "cmjalm0ob00ego00167fktogc",
        code: "ES-603-CH",
        description: "Skirting : Aluminium, Finish: Golden",
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:43:55.499")!,
        updatedAt: parseDate("2025-12-17 22:43:55.499")!,
      },
      {
        id: "cmjalrk1500fto001jvz37gu1",
        code: "ES-611-24",
        description: parseDescription('"Spot Light_Warm\nlight size:φ80*8MM 3W 4000k CRI≥80 300LM SMD2835,21PCS with 12W 1A DRIVER AND SENSOR HEAR AND PLUG"'),
        sortOrder: 0,
        status: "active",
        createdBy: "cmjaf1zyl000so001apq1aznq",
        createdAt: parseDate("2025-12-17 22:48:13.865")!,
        updatedAt: parseDate("2025-12-17 22:48:13.865")!,
      },
    ];

    for (const group of moduleGroups) {
      await prisma.moduleGroup.upsert({
        where: { id: group.id },
        update: {
          code: group.code,
          description: group.description,
          sortOrder: group.sortOrder,
          status: group.status,
          updatedAt: group.updatedAt,
        },
        create: group,
      });
      console.log(`✅ Upserted module group: ${group.code || group.id}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ SUCCESS: Seeded ${moduleGroups.length} module groups`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR: Seeding failed!");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("💥 Fatal error details:", e);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

