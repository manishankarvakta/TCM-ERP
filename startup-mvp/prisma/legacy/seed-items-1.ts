import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to parse SQL values
function parsePrice(priceStr: string | null): string {
  if (!priceStr) return "0";
  // Remove quotes if present
  const cleaned = priceStr.replace(/^"|"$/g, "");
  return cleaned || "0";
}

function parseDescription(desc: string | null): string {
  if (!desc) return "";
  // Remove quotes if present
  return desc.replace(/^"|"$/g, "");
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Items (Chunk 1/5)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const items = [
      {
        id: "cmj9sh0zp000oo101210zrep1",
        code: "asa",
        description: "afsgvw",
        unitId: "cmj9se2bp000ao101xqyl20n4",
        unitPrice: parsePrice("1220"),
        costPrice: parsePrice("0"),
        image: "https://dev.espaciobd.com/api/files/cmj9sd9xq0000o1010acd1hsq/2phone.png",
        status: "active",
        createdAt: new Date("2025-12-17T09:08:13.766Z"),
        updatedAt: new Date("2025-12-17T18:15:51.740Z"),
      },
      {
        id: "cmjalw1xq00g3o00139b9niyy",
        code: "ES-130-90",
        description: "Plastic Cutlary Tray",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("20000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-17T22:51:43.695Z"),
        updatedAt: new Date("2025-12-17T22:51:43.695Z"),
      },
      {
        id: "cmjalx5fi00g9o001yp81mjv7",
        code: "ES-130-80",
        description: "Plastic Cutlary Tray",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("20000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-17T22:52:34.879Z"),
        updatedAt: new Date("2025-12-17T22:52:34.879Z"),
      },
      {
        id: "cmjalxyv900gfo001ki52vjb1",
        code: "ES-130-60",
        description: "Plastic Cutlary Tray",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("20000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-17T22:53:13.030Z"),
        updatedAt: new Date("2025-12-17T22:53:13.030Z"),
      },
      {
        id: "cmjalyud300glo001fo8mlq0u",
        code: "ES-K-711-KB",
        description: parseDescription('"KNIFE BLOCK TAVINEA SORTO NOVA  PRO SCALA Knife block for 6 knives, always  protected and ready to hand. Colour: Ash nature Suitable for frame NP Scala H90 length 500 mm , Height 26 mm Material Wood"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("20000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-17T22:53:53.848Z"),
        updatedAt: new Date("2025-12-17T22:53:53.848Z"),
      },
      {
        id: "cmjalzfvl00gro001bwxukv87",
        code: "ES-K-713-FH",
        description: parseDescription('"Foil holder Nova Pro 500mm For foil and cling film, perfectly stored  away and easy to tear off. Colour Ash nature Suitable for frame NP Scala H90  length 500 mm & Height 45 mm Material Aluminium / wood"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("20000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-17T22:54:21.729Z"),
        updatedAt: new Date("2025-12-17T22:54:21.729Z"),
      },
      {
        id: "cmjam00vb00gxo001sh4c5m8r",
        code: " ES-715-TS",
        description: parseDescription('"Tavenia Sorto NP/V8 NL 500 B276  stone Perfect organisation for utensil powder-coated steel, Anti Slip Colour Stone, Material Steel Suitable for frame NP Scala H90 Suitable for nominal length 500 mm Suitable for body width From 400 mm"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("20000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-17T22:54:48.935Z"),
        updatedAt: new Date("2025-12-17T22:54:48.935Z"),
      },
      {
        id: "cmjb1sn9k0001o001gc40zd3a",
        code: " ES-717-TS",
        description: parseDescription('"Tavenia Sorto NP/V8 NL 500 B186 stone Perfect organisation for utensil and small  parts drawers, powder-coated steel, Anti  Slip Colour Stone, Material Steel Suitable for frame NP Scala H90 Suitable for nominal length 500 mm Suitable for body width From 300 mm Width 186 mm"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("20000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T06:16:58.568Z"),
        updatedAt: new Date("2025-12-18T06:16:58.568Z"),
      },
      {
        id: "cmjb4kjna000ro001gezl5yzb",
        code: "ES-500-DP",
        description: "Dynapro full extension slide Soft-close,Length-500mm,40kg Set: One left, one right• Fully synchronised slide technology• Soft-close damping system• Stepless self-locking of the drawer when placed on the slide• Tool-free 4D adjustment facility:- Height adjustment +3.5 mm- Side adjustment ±1.5 mm- Tilt angle adjustment +4 mm- Depth adjustment +3.5 mm",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("7300"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:34:39.479Z"),
        updatedAt: new Date("2025-12-18T07:34:39.479Z"),
      },
      {
        id: "cmjb4l7fe000xo001ix6n79x8",
        code: "ES-450-DP",
        description: "Dynapro full extension slideSoft-closeSet: One left, one right Lenth-450mm.40kg.• Fully synchronised slide technology• Soft-close damping system• Stepless self-locking of the drawer when placed on the slide• Tool-free 4D adjustment facility:- Height adjustment +3.5 mm- Side adjustment ±1.5 mm- Tilt angle adjustment +4 mm- Depth adjustment +3.5 mm",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("7100"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:35:10.298Z"),
        updatedAt: new Date("2025-12-18T07:37:28.207Z"),
      },
      {
        id: "cmjb4miko0013o0014fml7yyg",
        code: "ES-400-DP",
        description: "Dynapro full extension slide Soft-close,Length-400,40kg Set: One left, one right• Fully synchronised slide technology• Soft-close damping system• Tool-free 4D adjustment facility:- Height adjustment +3.5 mm- Side adjustment ±1.5 mm- Tilt angle adjustment +4 mm- Depth adjustment +3.5 mm",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("6800"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:36:11.400Z"),
        updatedAt: new Date("2025-12-18T07:37:14.381Z"),
      },
      {
        id: "cmjb4njhu0019o001hjhqlpja",
        code: "ES-350-DP",
        description: "Dynapro full extension slide Soft-close,Length-350,40kg Set: One left, one right• Fully synchronised slide technology• Soft-close damping system• Tool-free 4D adjustment facility:- Height adjustment +3.5 mm- Side adjustment ±1.5 mm- Tilt angle adjustment +4 mm- Depth adjustment +3.5 mm",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("6300"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:36:59.251Z"),
        updatedAt: new Date("2025-12-18T07:36:59.251Z"),
      },
      {
        id: "cmjb4oemp001no001h085ykwq",
        code: "ESGF278AP002",
        description: parseDescription('"78cm 2 Burner Gas Hob Technical Specifications: ELEMENT CONFIGURATION Left (kW): 3.8 Right (kW): 3.8 Centre (kW): - No. Burners: 2 Burner Type: Full Brass Burner Pan Supports: Cast Iron Ignition: Auto Ignition DC 1.5V Flame Failure: Y Gas Type: LPG Panel Material: 8mm Tempered Glass Safety Device: YES Dimensions (W) x (H) x (D): 780*450*130MM"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("38400"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:37:39.601Z"),
        updatedAt: new Date("2025-12-18T07:37:39.601Z"),
      },
      {
        id: "cmjb4p5hf001to001jf6c7rfl",
        code: "ES-300-DP",
        description: "Dynapro full extension slide Soft-close, Length-300,40kg Set: One left, one right• Fully synchronised slide technology• Soft-close damping system• Tool-free 4D adjustment facility:- Height adjustment +3.5 mm- Side adjustment ±1.5 mm- Tilt angle adjustment +4 mm- Depth adjustment +3.5 mm",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("6150"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:38:14.404Z"),
        updatedAt: new Date("2025-12-18T07:38:14.404Z"),
      },
      {
        id: "cmjb4q622001zo0012hystt2i",
        code: "ES-250-DP",
        description: "Dynapro full extension slide Soft-close, Length-250,40kg Set: One left, one right• Fully synchronised slide technology• Soft-close damping system• Tool-free 4D adjustment facility:- Height adjustment +3.5 mm- Side adjustment ±1.5 mm- Tilt angle adjustment +4 mm- Depth adjustment +3.5 mm",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("6000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:39:01.802Z"),
        updatedAt: new Date("2025-12-18T07:39:01.802Z"),
      },
      {
        id: "cmjb4qyk70025o0014aa6a1ko",
        code: "ES-301-DPTM",
        description: parseDescription('"Dynapro Tipmatic Soft-close Set: Unit and activator,one of each left/right"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("4900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:39:38.743Z"),
        updatedAt: new Date("2025-12-18T07:39:38.743Z"),
      },
      {
        id: "cmjb4r4f4002bo001hfug4ic2",
        code: "ESGF378AP002",
        description: parseDescription('"78cm 3 Burner Gas Hob Technical Specifications: ELEMENT CONFIGURATION Left (kW): 3.8 Right (kW): 3.8 Centre (kW): 1.5 No. Burners: 3 Burner Type: Full Brass Burner Pan Supports: Cast Iron Ignition: Auto Ignition DC 1.5V Flame Failure: Y Gas Type: LPG Panel Material: 8mm Tempered Glass Safety Device: YES Dimensions (W) x (H) x (D): 780*450*130MM"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("45240"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:39:46.336Z"),
        updatedAt: new Date("2025-12-18T07:39:46.336Z"),
      },
      {
        id: "cmjb4sd7a002ho001skiwcuha",
        code: "ES-723-MF",
        description: parseDescription('"Nova Pro Scala drawer sides H90 Set: One left, one right,Length-500mm The practical standard drawer for all applications • Can be personalised • Integrated height and side adjustment • Bottom panel machining not required"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("8300"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:40:44.375Z"),
        updatedAt: new Date("2025-12-18T07:40:44.375Z"),
      },
      {
        id: "cmjb4shjr002no0012vth3snn",
        code: "ESGF280K1001",
        description: parseDescription('"80cm 2 Burner Gas Hob Technical Specifications: ELEMENT CONFIGURATION Left (kW): 4.5 Right (kW): 4.5 Centre (kW): - No. Burners: 2 Burner Type: Full Brass Burner Pan Supports: Cast Iron Ignition: Auto Ignition DC 1.5V Flame Failure: Y Gas Type: LPG Panel Material: 8mm Tempered Glass Safety Device: YES Dimensions (W) x (H) x (D): 800*450*140MM"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("39520"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:40:50.008Z"),
        updatedAt: new Date("2025-12-18T07:40:50.008Z"),
      },
      {
        id: "cmjb4tgyk002to001qnwyv4il",
        code: "ES-725-DF",
        description: parseDescription('"Nova Pro Scala drawer sides H186 Set: One left, one right,Lenth-500mm Slim, closed drawer side • High stability up to a front height of 780 mm angle adjustment • Bottom panel machining not required"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("14300"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:41:35.900Z"),
        updatedAt: new Date("2025-12-18T07:41:35.900Z"),
      },
      {
        id: "cmjb4ul9f002zo0018c0g31ez",
        code: "ESGF380K1001",
        description: parseDescription('"80cm 3 Burner Gas Hob Technical Specifications: ELEMENT CONFIGURATION Left (kW): 4.5 Right (kW): 4.5 Centre (kW): 1.5 No. Burners: 3 Burner Type: Full Brass Burner Pan Supports: Cast Iron Ignition: Auto Ignition DC 1.5V Flame Failure: Y Gas Type: LPG Panel Material: 8mm Tempered Glass Safety Device: YES Dimensions (W) x (H) x (D): 800*450*140MM"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("47600"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:42:28.131Z"),
        updatedAt: new Date("2025-12-18T07:42:28.131Z"),
      },
    ];

    for (const item of items) {
      await prisma.item.upsert({
        where: { code: item.code.trim() },
        update: {
          description: item.description,
          unitId: item.unitId,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          image: item.image,
          status: item.status,
          updatedAt: item.updatedAt,
        },
        create: {
          id: item.id,
          code: item.code.trim(),
          description: item.description,
          unitId: item.unitId,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          image: item.image,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
      });
      console.log(`✅ Upserted item: ${item.code.trim()}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ SUCCESS: Seeded ${items.length} items (Chunk 1/5)`);
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

