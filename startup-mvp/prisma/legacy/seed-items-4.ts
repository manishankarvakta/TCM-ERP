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
  console.log("🌱 SEEDING: Items (Chunk 4/5)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const items = [
      {
        id: "cmjb6pd2h009ro00167k8lweb",
        code: "ES-919-TU",
        description: parseDescription('"CONVOY Premio(Right side) TALL UNIT-2000MM Right side use For cabinet width: 600mm Clear inside width: 564 mm Clear inside depth: 500 mm Inside cabinet height: 2,000 mm Opening angle: 150° Suitable for left hand opening Storage weight: 130kg Unit: 5 shelfs kit, 5 accessories shelfs, 1 drag system, 1 support angle, 1 connection bar, 2 frontal connectors, convoy premio rail eTouch: (optional) Applicable to Dry & Wet kitchen : Storage: dry, packed & storable foodstuffs"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("190000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:34:23.465Z"),
        updatedAt: new Date("2025-12-18T08:34:23.465Z"),
      },
      {
        id: "cmjb6w882009xo001lvn1dw3h",
        code: "ES-920-TU",
        description: parseDescription('"CONVOY Premio(Left Side) For cabinet width: 600mm Clear inside width: 564 mm Clear inside depth: 500 mm Inside cabinet height: 2,000 mm Opening angle: 150° Suitable for left hand opening Storage weight: 130kg Unit: 5 shelfs kit, 5 accessories shelfs, 1 drag system, 1 support angle, 1 connection bar, 2 frontal connectors, convoy premio rail eTouch: (optional) Applicable to Dry & Wet kitchen : Storage: dry, packed & storable foodstuffs"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("190000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:39:43.779Z"),
        updatedAt: new Date("2025-12-18T08:39:43.779Z"),
      },
      {
        id: "cmjb6xvle00a3o0010mcg90di",
        code: "ES-PKE611D17M",
        description: 'Serie | 4, Electric hob, 60 cm, Black Technical Data Product name/family : Cooking zone ceramic Construction type : Built-in Energy input : Electric Total number of positions that can be used at the same time : 4 Required niche size for installation (HxWxD) : 45 x 560-560 x 490-500 Width of the appliance : 592 Dimensions : 45 x 592 x 522 Dimensions of the packed product (HxWxD) (mm) : 100 x 750 x 590 Net weight (kg) : 7.260',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("64900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:41:00.722Z"),
        updatedAt: new Date("2025-12-18T08:41:00.722Z"),
      },
      {
        id: "cmjb6zhqe00a9o001x141k3m3",
        code: "ES-PUE611BB1E",
        description: 'Series | 4  BOSCH 60 cm Inductions - Ceramic hob. The induction hob Size and weight Dimensions of the product (mm) 51 x 592 x 522 mm Net weight (kg) 11.256 kg ',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("119900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:42:16.070Z"),
        updatedAt: new Date("2025-12-18T08:42:16.070Z"),
      },
      {
        id: "cmjb70kee00afo001ydh6k6t1",
        code: "ES-536.02.599",
        description: 'BBQ BI 01 30cm Built In Barbecue Grill •Finish: Stainless Steel •Design: Inox •Control: Knob •Ignition: Electric •Comfort: Easy to clean Enamel Grill •Cooking: Lava Stone •Indicator: Heating •4rm Cable Is a Must • Power Source Has to be Indivisual •Earthing is a must •Outer Product Dimensions (WXDXH) •288mm X 510mm X 50mm •Cut out Dimensions (WXDXH) •268mm X 485mm X 100mm',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("47100"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:43:06.183Z"),
        updatedAt: new Date("2025-12-18T08:43:06.183Z"),
      },
      {
        id: "cmjb71rx000alo001ghz6zck0",
        code: "ES-538.01.501 OR 538.01.491",
        description: 'BELLA 30 30 cm Domino Induction Hob •Cooking Zones: 2 Induction Zones •Worktop Design: SCHOTT Glass •Worktop Control: Full touch interface •Power Levels: 9 stage •Keep Warm Function: Yes •Front: Ø 14 cm, 1500 W •Back: Ø 18 cm, 2000 W •Residual Heat Indicator: Yes •Electrical Requirement •220/240 V, 50/60 Hz, 24 A, 3500 W • 6rm Cable Is a Must • Power Source Has to be Indivisual •Earthing is a must •Product Dimensions (WXHXD) •288 mm X 58 mm X 520 mm •Cut out Dimensions (WXD) •260 mm X 490 mm',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("42250"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:44:02.581Z"),
        updatedAt: new Date("2025-12-18T08:44:02.581Z"),
      },
      {
        id: "cmjb73suu00aro001hignp110",
        code: "ES-DFT63CA50M",
        description: ' Telescopic Cooker Hood 60 cm Silver  Metallic. The telescopic cooker hood: practically disappears into your  upper cabinet, giving you a sleek kitchen front.',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("49900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:45:37.110Z"),
        updatedAt: new Date("2025-12-18T08:45:37.110Z"),
      },
      {
        id: "cmjb76bxd00axo0016hkk91v3",
        code: "ES-DFT93CA50M",
        description: 'Telescopic cooker hood 90cm Silver metallic Dimensions exhaust air (HxWxD): 175-175 x 898 x 300 mm   Dimensions recirculating (HxWxD): 175-175 x 898 x 300 mm   Diameter pipe Ø 150 mm (Ø 150 mm enclosed) ',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("69900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:47:35.137Z"),
        updatedAt: new Date("2025-12-18T08:47:35.137Z"),
      },
      {
        id: "cmjb77mdx00b3o001o8ds4v96",
        code: "ES-DVS-90AD ",
        description: 'Vertical chimney hood Touch control with digital display 3 speeds with 2 LED lamps (1.5W) Exhaust capacity: 1,500m3 /h Sound power level: 65 dBA Metal filters RIM extraction Delay timer Ducting system Kraftvoll technology ',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("59660"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:48:35.349Z"),
        updatedAt: new Date("2025-12-18T08:48:35.349Z"),
      },
      {
        id: "cmjb7ckqa00b9o001v9u3apbp",
        code: "ES-LDH TC 90.1",
        description: 'COOKER HOOD Main Features  -Wall Cooker Hood -Touch Control with LED Display. -3 Speeds. -Exhaust Capacity 1200 m3/h. 2 LED Ilumination. 2 Layer Baffer Filter. -Product Dimension mm (900 x 500 x 548-1000. -Black Glass Front Panel/ Stainless Steel ',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("53800"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:52:26.482Z"),
        updatedAt: new Date("2025-12-18T08:52:26.482Z"),
      },
      {
        id: "cmjb7h9a400bfo001yrrn0333",
        code: "ES-DWG098D60I",
        description: 'Serie | 2, wall-mounted cooker hood, 90 cm, flat black Technical Data Typology : Wall-mounted Approval certificates : not relevant Height of product, without chimney : 330 mm Net weight : 20.1 kg Dimensions of the product, with chimney (if exists) : 594 x 898.0 x 520.0 mm Dimensions of the packed product (HxWxD) : 630 x 405 x 970 mm Net weight : 20.1 kg Gross weight : 22.5 kg',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("49900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:56:04.924Z"),
        updatedAt: new Date("2025-12-18T08:56:04.924Z"),
      },
      {
        id: "cmjb7sqcg00blo0013l8lnflr",
        code: "ES-DIB97IM50M",
        description: parseDescription('"Serie | 4, Island cooker hood, 90 cm, Stainless steel Technical Data Typology : Chimney Approval certificates : CE, G-Mark, VDE Length electrical supply cord (cm) : 130 Height of the chimney (mm) : 691-871/691-991 Height of product, without chimney (mm) : 53 Net weight (kg) : 31.177'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("179900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:05:00.256Z"),
        updatedAt: new Date("2025-12-18T09:05:00.256Z"),
      },
      {
        id: "cmjb7u7uj00bro001gcg5xjc5",
        code: "ES-DWK065G60M",
        description: 'Series | 4 BOSCH Chimney hood, 60 cm Inclined glass brand design – black. The wall-mounted chimney hood Dimensions exhaust air (HxWxD): 862-1080 x 596 x 386 mm Dimensions recirculating (HxWxD): 750-1080 x 596 x 386 mm Power rating: 216 W Wall mounted hood',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("49900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:06:09.595Z"),
        updatedAt: new Date("2025-12-18T09:06:09.595Z"),
      },
      {
        id: "cmjb7vh2100bxo0018akxn7tc",
        code: "ES-DHL885C",
        description: 'Serie | 6, Canopy Extractor, 86 cm, Stainless steel Technical data Typology : Built-in/Built-under (HxWxD) : 418mm x 836.0mm x 264mm mm Dimensions of the packed product : 14.56 x 18.30 x 38.18 Net weight : 22.000 lbs Gross weight : 31.000 lbs Length electrical supply cord : 150 cm Dimensions of the product, with chimney (if exists) : 418 x 860.0 x 300.0 mm Dimensions of the packed product (HxWxD) : 370 x 465 x 970',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("85900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:07:08.185Z"),
        updatedAt: new Date("2025-12-18T09:07:08.185Z"),
      },
      {
        id: "cmjb7wx4l00c3o001mx08l75v",
        code: "ES-BEL554MS0M",
        description: 'Built-In Microwave Technical Data Type of micro-wave oven :   MW+Grill function Type  of  control  :    Electronic Color  /  Material  Front  :    Stainless  steel Dimensions :  382 x 594 x 388 Cavity dimensions (mm) :  208.0 x 328.0 x 369.0 Length  electrical  supply  cord  (cm)  :  130 Net  weight  (kg)  :   18.045 Gross  weight  (kg)  :   20.7 Maximum  micro-wave  power  (W)  :  900',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("69900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:08:15.669Z"),
        updatedAt: new Date("2025-12-18T09:08:15.669Z"),
      },
      {
        id: "cmjb8237900c9o001i37dlh30",
        code: "ES-HBF113BR0M",
        description: 'Built-in Grill Oven Technical Data Gross weight : 34.2 kg Color / Material Front : Stainless steel Built-in / Free-standing : Built-in Integrated Cleaning system : Hydrolytic Min. required niche size for installation (HxWxD) : 575-597 x 560-568 x 550 mm Dimensions : 595 x 594 x 548 mm',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("89900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:12:16.821Z"),
        updatedAt: new Date("2025-12-18T09:12:16.821Z"),
      },
      {
        id: "cmjb83awv00cjo0014weuj4w1",
        code: "ES-HBJ538EB0M",
        description: 'Serie | 4, built-in oven, 60 x 60 cm, Black Technical Data Color / Material Front : Black Built-in / Free-standing : Built-in Integrated Cleaning system : Catalytic partial, Hydrolytic Required niche size for installation (HxWxD) : 575-597 x 560-568 x 550 Dimensions : 595 x 594 x 548 Dimensions of the packed product (HxWxD) (mm) : 665 x 680 x 660',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("85900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:13:13.471Z"),
        updatedAt: new Date("2025-12-18T09:13:13.471Z"),
      },
      {
        id: "cmjb84fug00cpo0015fxbq7n9",
        code: "ES-HBN211E2M",
        description: "HBF113BR0M",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("65900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:14:06.520Z"),
        updatedAt: new Date("2025-12-18T09:14:06.520Z"),
      },
      {
        id: "cmjb87a1d00cvo001l1qtbzuj",
        code: "ES-HBJ538ES0M",
        description: 'Built-in Grill Oven Serie | 4, built-in oven, 60 x 60 cm, Stainless steel Technical Data Color  /  Material  Front  :    Stainless  steel Built-in  /  Free-standing  :  Built-in Integrated Cleaning system :   Catalytic partial, Hydrolytic Required niche size for installation (HxWxD) :  575-597  x  560-568  x  550 Dimensions :  595 x 594 x 548',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("93900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:16:18.961Z"),
        updatedAt: new Date("2025-12-18T09:16:18.961Z"),
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
    console.log(`✅ SUCCESS: Seeded ${items.length} items (Chunk 4/5)`);
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

