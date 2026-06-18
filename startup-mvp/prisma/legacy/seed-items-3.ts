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
  console.log("🌱 SEEDING: Items (Chunk 3/5)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const items = [
      {
        id: "cmjb68een006ho001b3279jx8",
        code: "ES-TG66 G31 ",
        description: parseDescription('"Free Standing cooker Gas-Electric hob and Electronic oven, 60 x 60 cm. Hob Features: • Enamel grid • Stainless Steel surface • 4 Cooking zones: 1 Semi-rapid 1.75 kW., 1 Auxiliary burner: 1 kW., 1 Rapid: 3 kW., 1 Electric hot plate 1.0 kW. • Auto ignition Oven Features: • Multifunction oven (Turbo) • 8 cooking functions • Oven capacity: 90 litres • Dimension: 600 x 600 x 850/900 mm. (WxDxH)"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("88700"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:21:12.047Z"),
        updatedAt: new Date("2025-12-18T08:21:12.047Z"),
      },
      {
        id: "cmjb690sg006no0012d2frbfh",
        code: "ES-923-BC",
        description: parseDescription('"Cleaning agent pull-out  PORTERO – Set 1,  WxDxH 160 x 468 x 395"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("17250"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:21:41.056Z"),
        updatedAt: new Date("2025-12-18T08:21:41.056Z"),
      },
      {
        id: "cmjb6acwb006to001q74aybam",
        code: "ES-HGA120B51M",
        description: '4 Burner Gas Hob Technical Data Built-in / Free-standing : Free-standing Dimensions : 850-865 x 600 x 600 mm Length electrical supply cord : 120 cm Net weight : 44.023 kg Gross weight : 47.8 kg Cooking method : Gas bottom heating, Gas grill/broiler Integrated Cleaning system : No Dimensions : 850-865 x 600 x 600 mm Dimensions of the packed product (HxWxD) : 965 x 680 x 655 mm"',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("89900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:22:43.404Z"),
        updatedAt: new Date("2025-12-18T08:23:50.739Z"),
      },
      {
        id: "cmjb6adz0006zo001rlgucuan",
        code: "ES-913-BC",
        description: parseDescription('"COMFORT II Fitting set 90, Incl. GRASS Nova Pro full-extension runner Cabinet depth : 400 Cabinet Height: 662mm, Cabinet Left hand, silver Clear inside depth: ≥ 496 mm Clear inside width: 328 tray width + 33 mm COMFORT Tray 295x470x88mm ARENAplus classic-icewhite, PU:2"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("39900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:22:44.796Z"),
        updatedAt: new Date("2025-12-18T08:22:44.796Z"),
      },
      {
        id: "cmjb6bb7j0075o0017okvmebi",
        code: "ES-914-BC",
        description: parseDescription('"COMFORT II -Cabinet Right handFor cabinet width: 400mmClear inside depth: 500mmInside cabinet height: 650 mmOpening angle: full extension, soft closeStorage weight: 20kgUnit: 1 full extension frame, 1 runner , 2 shelves Applicable to Dry & Wet kitchen : Storage: dry, packed,bottle, storable foodstuffs,Spice stuffs & others"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("39900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:23:27.871Z"),
        updatedAt: new Date("2025-12-18T08:23:27.871Z"),
      },
      {
        id: "cmjb6c3dh007fo001l1q6njrf",
        code: "ES-912-D.J-L/R",
        description: parseDescription('"DISPENSA junior III 1 fitting set 2 DISPENSA trays Fitting set 450mm, bottom  mounted, DEAPENSA tray 450mm  ARENAplus classic-icewhite "'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("42000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:24:04.373Z"),
        updatedAt: new Date("2025-12-18T08:24:04.373Z"),
      },
      {
        id: "cmjb6d3s5007lo001ukdyd5my",
        code: "ES-908-CU",
        description: "MagicCorner Tray / Set of 4 ARENAplus classic, silver/icewhite right hand swivelling fittingsUnit: 4 shelves with pre-mounted fitting, without axleApplicable to Dry & Wet kitchen :Storage: Cooking Pan stuffs ,Crocarize grades & others",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("85500"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:24:51.558Z"),
        updatedAt: new Date("2025-12-18T08:24:51.558Z"),
      },
      {
        id: "cmjb6ecze007ro001v545xo3a",
        code: "ES-907-CU",
        description: "MagicCorner Tray / Set of 4 ARENAplus classic, silver/icewhite left hand swivelling fittingsUnit: 4 shelves with pre-mounted fitting, without axleApplicable to Dry & Wet kitchen :Storage: Cooking Pan stuffs ,Crocarize grades & others",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("855000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:25:50.139Z"),
        updatedAt: new Date("2025-12-18T08:25:50.139Z"),
      },
      {
        id: "cmjb6f1u3007xo001jwv9e2se",
        code: "ES-HGVDA0Q50M ",
        description: 'Serie | 4 BOSCH  5 Burner Gas Hob Technical Data Built-in / Free-standing : Free-standing Dimensions : 884 x 899 x 607 Length electrical supply cord (cm) : 180 Net weight (kg) : 76.972 Gross weight (kg) : 82.6 Cooking method : defrost, Gas bottom heating, Gas grill/broiler, Gas top/bottom heat, rotisserie Integrated Cleaning system : No Included accessories : 1 x rotary spit, 1 x nozzle set for natural gas, 1 x cross support for espresso, 1 x grid, 1 x universal pan Gas type : LPG G30 30 mbar Appliance Dimensions (h x w x d) (in) : x 899 MM x Gross weight (lbs) : 182.000 Length electrical supply cord (cm) : 180 Dimensions : 884 x 899 x 607 Dimensions of the packed product (HxWxD) (mm) : 876 x 702 x 980',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("178900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:26:22.347Z"),
        updatedAt: new Date("2025-12-18T08:26:22.347Z"),
      },
      {
        id: "cmjb6fgji0083o0019o3hrne5",
        code: "ES-909-CU",
        description: parseDescription('"LeMans corner unit swing-out tray ARENA Style Sets (= 2 ARENA Style trays and accessories) Swings out to the left, for door  width 450mm, cabinet  inside 900mm"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("59250"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:26:41.407Z"),
        updatedAt: new Date("2025-12-18T08:26:41.407Z"),
      },
      {
        id: "cmjb6gpu30089o0019mdpj16b",
        code: "ES-910-CU",
        description: parseDescription('"LeMans corner unit swing-out tray ARENA Style Sets (= 2 ARENA Style trays and accessories) Swings out to the right, for door  width 450mm, cabinet inside900mm"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("59250"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:27:40.107Z"),
        updatedAt: new Date("2025-12-18T08:27:40.107Z"),
      },
      {
        id: "cmjb6i323008fo001p796z81p",
        code: "ES-905-BC",
        description: parseDescription('"TANDEM side Fitting-Set  600/  600mm, anthracite, PU: 1 TANDEM side tray 600mm,  ARENAplus style - anthracite, PU:2"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("25500"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:28:43.899Z"),
        updatedAt: new Date("2025-12-18T08:28:43.899Z"),
      },
      {
        id: "cmjb6iqzr008lo0018jhv4quw",
        code: "ES-PCR9A5B90M",
        description: 'BOSCH Gas hob,Serie | 6,  gas hob, 90 cm, Stainless steel  Technical Data Product name/family : gas hob w integrated controls Construction type : Built-in Energy input : Gas Total number of positions that can be used at the same time : 5 Required niche size for installation (HxWxD) : 45 x 850-852 x 490-502 Width of the appliance : 915 Dimensions : 45 x 915 x 520 Dimensions of the packed product (HxWxD) (mm) : 165 x 1116 x 659',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("105000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:29:14.919Z"),
        updatedAt: new Date("2025-12-18T08:29:14.919Z"),
      },
      {
        id: "cmjb6jcqq008ro001anc5ivve",
        code: "ES-904-TU",
        description: parseDescription('"TANDEM side Fitting-Set 600/ 1,700mm, icewhite, PU: 1 TANDEM side 6 tray 600mm, ARENAplus style - icewhite, PU:2 Door 4 tray x 3.5kg= Max 12kg"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("48800"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:29:43.106Z"),
        updatedAt: new Date("2025-12-18T08:29:43.106Z"),
      },
      {
        id: "cmjb6kolf008xo001owkcmw1c",
        code: "ES-906-M.D-L/F",
        description: parseDescription('"SWIVEL PULL-OUT FOR LARDER  UNITS Clip-on shelf ARENA Style,  Cabinet size HxWxD 800mmx 600 mm,x 500mm"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("69900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:30:45.123Z"),
        updatedAt: new Date("2025-12-18T08:30:45.123Z"),
      },
      {
        id: "cmjb6krhd0093o001x729o3du",
        code: "ES-TZ 3210",
        description: '30cm Modular Vitroceramic Hob with 2 zones REF. 40204360 EAN. 8421152153468 Select a colour: Black Glass Black Glass  Touch Control with acoustic sensors and safety lock 2 zones (Ø145 mm + Ø180 mm) Residual heat indicators Maximum rated power: 3,000 W',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("54800"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:30:48.865Z"),
        updatedAt: new Date("2025-12-18T08:30:48.865Z"),
      },
      {
        id: "cmjb6m2r50099o0017x7fwm3q",
        code: "ES-PKF375CA1M",
        description: 'Serie | 2, domino hob, electric, 30 cm,Black Product name/family : Vario/Domino cooking zone cera Built-in / Free-standing : Built-in Energy input : Electric Total number of positions that can be used at the same time : 2 Required niche size for installation (HxWxD) : 48 x x Width of the appliance : 306 Dimensions : 48 x 306 x 527 Dimensions of the packed product (HxWxD) (mm) : 120 x 375 x 590',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("67900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:31:50.129Z"),
        updatedAt: new Date("2025-12-18T08:31:50.129Z"),
      },
      {
        id: "cmjb6mihm009fo001vxvd27ph",
        code: "ES-902-TU",
        description: parseDescription('"TANDEM swivel pull-out  Clipon shelf ARENAplus Style for cabinet width 450mm Clear inside width: ≥ 412 mm Clear inside depth: ≥ 500 mm Clear inside height: 6-levels: from  1.700 mm, Opening angle: 110° max. load with 6 shelves:,  Rear element: 50 kg Door element: 20 kg"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("123900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:32:10.522Z"),
        updatedAt: new Date("2025-12-18T08:32:10.522Z"),
      },
      {
        id: "cmjb6o3kb009lo001xdda58bl",
        code: "ES-901-T-L/R",
        description: parseDescription('"TANDEM swivel pull-out  Clipon shelf ARENAplus Style for cabinet width 600mm Clear inside width: ≥ 412 mm Clear inside depth: ≥ 500 mm Clear inside height: 6-levels: from  1.700 mm, Opening angle: 110° max. load with 6 shelves:,  Rear element: 50 kg Door element: 20 kg"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("134900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T08:33:24.491Z"),
        updatedAt: new Date("2025-12-18T08:33:24.491Z"),
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
    console.log(`✅ SUCCESS: Seeded ${items.length} items (Chunk 3/5)`);
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

