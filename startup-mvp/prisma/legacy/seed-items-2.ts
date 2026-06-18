import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parsePrice(priceStr: string | null): string {
  if (!priceStr) return "0";
  const cleaned = priceStr.replace(/^"|"$/g, "");
  return cleaned || "0";
}

function parseDescription(desc: string | null): string {
  if (!desc) return "";
  return desc.replace(/^"|"$/g, "");
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Items (Chunk 2/5)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const items = [
      {
        id: "cmjb4uujt0035o001mpxx8mgk",
        code: "ES-Matte",
        description: "Anti Slip Matte",
        unitId: "cmj9sfj0c000eo101ef5ktf85",
        unitPrice: parsePrice("750"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:42:40.169Z"),
        updatedAt: new Date("2025-12-18T07:42:40.169Z"),
      },
      {
        id: "cmjb4vna9003bo001l7h3kia6",
        code: "ES-GT LUX 78 2G AI AL 2TR",
        description: parseDescription('"Gas on Glass Hob in 78cm Black front control knobs Tempered Glass 2 gas burners: 2 Triple ring burner, 5,00 kW Max. (nominal) power: 10,00  Large cast iron pan supports Easy installation Type of Gas: LPG"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("36800"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:43:17.409Z"),
        updatedAt: new Date("2025-12-18T07:43:17.409Z"),
      },
      {
        id: "cmjb4w1za003ho0011rc1y74i",
        code: "ES-302-NPTM",
        description: "Nova Pro Tipmatic Soft-close Set: unit and activator, one on each side left/right Mechanical opening system for handle-free fronts• Can be used for Nova Pro Soft-close full extension slides• One unit for all nominal lengths and weight classes• 3-stage adjustment of the opening force",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("4900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:43:36.455Z"),
        updatedAt: new Date("2025-12-18T07:43:36.455Z"),
      },
      {
        id: "cmjb4xasm003no001eab14jeg",
        code: "ES-724-MI",
        description: parseDescription('"Nova Pro Scala Inner drawer H90 ( Flat pack , complete set)F8 inset Front panel for inner drawer H90 Length-1160mmSet: One left, one right• Can be personalised with designer panels• Width of bottom and back panel is the same• Bottom panel machining not requiredMaterial Steel, Colour Stone, Surface Epoxy coatingHeight 90 mmLength-500mmHeight adjustment +/- 2 mm, Lateral +/- 1.5mmApplication areaKitchen bathroom living room furniture"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("13500"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:44:34.534Z"),
        updatedAt: new Date("2025-12-18T07:44:34.534Z"),
      },
      {
        id: "cmjb4yke7003to001wdrysuun",
        code: "ES-729-DI",
        description: parseDescription('"Nova Pro Scala Inner drawer H186, ( Flat pack , complete set) F8 inset Front panel for inner drawer H90 Length-1160mm Set: One left, one right • Can be personalised with designer panels • Width of bottom and back panel is the same • Bottom panel machining not required Material Steel, Colour Stone, Surface Epoxy coating Height 186 mm Length-500mm Height adjustment +/- 2 mm, Lateral +/- 1.5mm Application area Kitchen bathroom living room furniture"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("19200"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:45:33.632Z"),
        updatedAt: new Date("2025-12-18T07:45:33.632Z"),
      },
      {
        id: "cmjb4zgsz003zo001xugrzip6",
        code: "ES-726-MC",
        description: parseDescription('"Nova Pro Scala Crystal drawer , H-94 (Flat pack,Complete set) Pot drawer for slide-in elements height 94 mm full extension slide Soft-close S16/S19 Set: One left, one right Nominal Length/Depth: 500 mm,40kg Material Steel,Colour Stone, Surface Epoxy coating Height adjustment +/- 2 mm,Lateral +/- 1.5 mm Application area Kitchen bathroom living room furniture"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("11900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:46:15.635Z"),
        updatedAt: new Date("2025-12-18T07:46:15.635Z"),
      },
      {
        id: "cmjb507xh0045o001dx2n4pf7",
        code: "ES-727-DC",
        description: parseDescription('"Nova Pro Scala Crystal Plus, H-140mm Frame drawer for large slide-in elements,  (Flat pack,Complete set) Set: One left, one right • Can be personalised with designer panels • Width of bottom and back panel is the same • Bottom panel machining not required Nominal Length/Depth: 500 mm,40kg Material Steel , Colour Stone, Surface Epoxy coating Height adjustment +/- 2 mm, Lateral +/- 1.5mm Application area Kitchen bathroom living room furniture"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("16400"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:46:50.789Z"),
        updatedAt: new Date("2025-12-18T07:46:50.789Z"),
      },
      {
        id: "cmjb526tv004bo0016yzuss3r",
        code: "ES-724-MI-1 ES-725-DF-1",
        description: "2 Drawers Base Unit Nova Pro Scala  Inner  drawer  H90 ( Flat pack , complete set) 1 set",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("27900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:48:22.676Z"),
        updatedAt: new Date("2025-12-18T07:48:22.676Z"),
      },
      {
        id: "cmjb536n8004ho001faukyya8",
        code: "ES-400-DR",
        description: "ES-Runner  Length: 400mm, Soft Close , 2D Adjustmante zink metal",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("4400"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:49:09.092Z"),
        updatedAt: new Date("2025-12-18T07:49:09.092Z"),
      },
      {
        id: "cmjb54mhc004no00198mxdais",
        code: "ES-450-DR",
        description: "ES-Runner   Length: 450mm, Soft Close , 2D Adjustmante zink metal",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("4650"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:50:16.273Z"),
        updatedAt: new Date("2025-12-18T07:50:16.273Z"),
      },
      {
        id: "cmjb568nw004to0011pi16xq6",
        code: "ES-V350",
        description: parseDescription('"Ball Bearing Drawer RunnerFixing: Side Mounted (Full Extention)Operation: Soft ClosingFinish: Zinc PlatedLength: 350mm OR 14"" -With Frame"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("1680"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:51:31.676Z"),
        updatedAt: new Date("2025-12-18T07:51:31.676Z"),
      },
      {
        id: "cmjb57ut9004zo001jb6oy4h8",
        code: "ES-V400",
        description: parseDescription('"Ball Bearing Drawer Runner Fixing: Side Mounted (Full Extention)Operation: Soft ClosingFinish: Zinc PlatedLength: 400mm OR 16"" -With Frame"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("1780"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:52:47.037Z"),
        updatedAt: new Date("2025-12-18T07:52:47.037Z"),
      },
      {
        id: "cmjb58p4h0055o001j47hml0s",
        code: "ES-V450",
        description: parseDescription('"Ball Bearing Drawer RunnerFixing: Side Mounted (Full Extention)Operation: Soft ClosingFinish: Zinc PlatedLength: 450mm OR 18"" -With Frame"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("1880"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:53:26.321Z"),
        updatedAt: new Date("2025-12-18T07:53:26.321Z"),
      },
      {
        id: "cmjb5c8th005bo001129suzlx",
        code: "ES-V500",
        description: parseDescription('"Ball Bearing Drawer RunnerFixing: Side Mounted (Full Extention)Operation: Soft ClosingFinish: Zinc PlatedLength: 500mm OR 20"" -With Frame"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("1950"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:56:11.813Z"),
        updatedAt: new Date("2025-12-18T07:56:11.813Z"),
      },
      {
        id: "cmjb5d3ze005ho001g35wgzmr",
        code: "ES-131-60",
        description: "Plate Holder/Organizar_600mmMaterial: ABSColor: GrayDisposable: Non-DisposableThickness: 2.5mm or 2.0mm",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("4300"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:56:52.202Z"),
        updatedAt: new Date("2025-12-18T07:56:52.202Z"),
      },
      {
        id: "cmjb5e3ew005no001ep9lmua9",
        code: "ES-131-90",
        description: "Plate Holder/Organizar_900mmMaterial: ABSColor: GrayDisposable: Non-DisposableThickness: 2.5mm or 2.0mm",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("5900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:57:38.121Z"),
        updatedAt: new Date("2025-12-18T07:57:38.121Z"),
      },
      {
        id: "cmjb5g9al005to001o1jjx54p",
        code: "ES-911-BC",
        description: "Cooking Agent Cabinet Dimensions (mm) WxDxH 300x 500x 550 Clear inside width: 268 mm",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("35500"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T07:59:19.053Z"),
        updatedAt: new Date("2025-12-18T07:59:19.053Z"),
      },
      {
        id: "cmjb669u0005zo0015r9wqvb9",
        code: "ES-927-3DX-L/R",
        description: parseDescription('"Bottle Holder 3D-X Spice bottle holder pull-out style complete; incl. full-extension runners Cabinet Dimensions (mm) WxDxH 150x 500x 550 Clear inside width: 112mm"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("19500"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:19:32.808Z"),
        updatedAt: new Date("2025-12-18T08:19:32.808Z"),
      },
      {
        id: "cmjb677mz0065o001xyd4awb1",
        code: "ES-929-BC",
        description: parseDescription('"3D-X Towel Holder pull-out style complete; incl. full-extension runners Cabinet Dimensions (mm) WxDxH 150x 500x 550 Clear inside width: 112mm"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("18750"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:20:16.620Z"),
        updatedAt: new Date("2025-12-18T08:20:16.620Z"),
      },
      {
        id: "cmjb67xfl006bo001udpdl928",
        code: "ES-931-TB",
        description: parseDescription('"Pull-out towel Bar Left Right Mounting 2 towel rails attaches left, right or under counter 2 arms, W x D: 102 x 495 Unit: Set"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("4000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:20:50.049Z"),
        updatedAt: new Date("2025-12-18T08:20:50.049Z"),
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
    console.log(`✅ SUCCESS: Seeded ${items.length} items (Chunk 2/5)`);
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

