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
  console.log("🌱 SEEDING: Items (Chunk 5/5)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const items = [
      {
        id: "cmjb885g300d1o001p89amxor",
        code: "ES-SMV50E00GC",
        description: 'Serie | 4, fully-integrated dishwasher, 60 cm The ActiveWater 60 with height-adjustable top rack: Gives you extra space for large and bulky items Technical Data Dimensions of the product (HxWxD) : 815 x 598 x 550 mm Dimensions of the packed product (HxWxD) : 860 x 665 x 640 mm',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("114900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:16:59.668Z"),
        updatedAt: new Date("2025-12-18T09:17:17.742Z"),
      },
      {
        id: "cmjb89ly200d9o001ykiha6bn",
        code: "ES-SMV25DX00T",
        description: 'Series | 2 BOSCH Full-Integrated Built-in Dishwasher 60 cm. Dimensions of the product (HxWxD): 81.5 x 59.8 x 55 cm',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("119900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:18:07.706Z"),
        updatedAt: new Date("2025-12-18T09:18:07.706Z"),
      },
      {
        id: "cmjb8aql400dfo001o1tvbt4e",
        code: "ES-SMS50E92GC",
        description: 'Serie | 4, free-standing dishwasher, 60 cm, White Technical Data Water consumption (l) : 9.9 Total annual energy consumption (kWh) 220 days : 186 Height with worktop (mm) : 30 Height of the product (mm) : 845 Adjustable feet : Yes - front only Maximum adjustability feet (mm) : 20 Net weight (kg) : 44.746 Gross weight (kg) : 46.0 Connection Rating (W) : 2400 Current (A) : 10 Voltage (V) : 220-240 Dimensions of the packed product (HxWxD) (mm) : 880 x 674 x 640',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("79900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:19:00.377Z"),
        updatedAt: new Date("2025-12-18T09:19:00.377Z"),
      },
      {
        id: "cmjb8bw5l00dlo001dyer6xr9",
        code: "ES-SMS67NI10M",
        description: 'Serie | 6, Free-standing dishwasher, 60 cm, Stainless steel, lacquered Technical Data Water consumption : 10.4 l Total annual energy consumption 220 days : 171 kWh Dimensions of the product (HxWxD) : 845 x 600 x 600 mm Dimensions of the packed product (HxWxD) : 880 x 665 x 644',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("136900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:19:54.249Z"),
        updatedAt: new Date("2025-12-18T09:19:54.249Z"),
      },
      {
        id: "cmjb8d9oc00dro00160ppmsuu",
        code: "ES-WAJ20170GC",
        description: 'Series | 2 BOSCH Washing Machine, Front Loader 7 kg 1000 rpm White Technical Specifications Ferrite-BLDC EcoSilence drive with 10 year warranty Main features Capacity: 7 kg Energy Efficiency Class: 2 Energy Stars Energy consumption 139 kWh per year, based on 220 standard washing cycles for cotton programmes at 60°C and 40°C at full and partial load, and the consumption of the low power modes. ',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("61900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:20:58.428Z"),
        updatedAt: new Date("2025-12-18T09:20:58.428Z"),
      },
      {
        id: "cmjb8ea1200e1o001h9qrc7v2",
        code: "ES-WAJ20180GC",
        description: 'Series | 2 BOSCH Washing Machine, Front Loader 8 kg 1000 rpm White. Technical information Dimensions (H x W x D): 84.8 x 59.8 x 59 cm Can be built-under Main features Capacity: 8 kg Ferrite-BLDC Energy Efficiency Class: 2 Energy Stars Energy consumption 157 kWh per year, based on 220 standard washing cycles for cotton programmes at 60°C and 40°C at full and partial load, and the consumption of the low power modes.',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("82900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:21:45.542Z"),
        updatedAt: new Date("2025-12-18T09:21:45.542Z"),
      },
      {
        id: "cmjb8fgef00f0o001zrg2yuy3",
        code: "ES-WAJ2017SGC",
        description: 'Serie | 2, washing machine, front loader, 7 kg, 1000 rpm Technical Data Built-in / Free-standing : Free-standing Door hinge : Left Color / Material body : silver inox Length electrical supply cord (cm) : 160 Height for building under : 848.00 Height of the product (mm) : 848 Dimensions of the product (mm) : 848 x 598 x 590 Wheels : No Net weight (kg) : 67.601',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("75900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:22:40.455Z"),
        updatedAt: new Date("2025-12-18T09:22:40.455Z"),
      },
      {
        id: "cmjb8gobx00f6o001arvkx0zi",
        code: "ES-WAJ2018SGC ",
        description: 'Series | 2 BOSCH washing machine, front loader 8 kg silver inox, 1000 rpm. Technical information Dimensions (H x W x D): 84.8 x 59.8 x 59 cm',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("84900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:23:37.390Z"),
        updatedAt: new Date("2025-12-18T09:23:37.390Z"),
      },
      {
        id: "cmjb8hr2y00fco001op7j406g",
        code: "ES-MT5151",
        description: "Television •Height Range: 600 mm",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("80000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:24:27.610Z"),
        updatedAt: new Date("2025-12-18T09:24:27.610Z"),
      },
      {
        id: "cmjb8j49r00fio0011eh5cci7",
        code: "ES-CP 15 GS",
        description: 'Plate warmer Fingerprint proof stainless steel Push-pull opening system Telescopic drawer with anti-sliding material 6 place settings 10 cm. useable height Temperature range 30°-80°C Illuminated switch on-off pilot Max. nominal power : 400 W',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("84500"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:25:31.359Z"),
        updatedAt: new Date("2025-12-18T09:25:31.359Z"),
      },
      {
        id: "cmjb8kap600foo0018vc734k2",
        code: "ES-CTL636ES1",
        description: 'Fully automatic espresso maker/fully automatic  coffee machine stainless steel. The built-in coffee center with  OneTouch Function: offers great variety and convenience.',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("392900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:26:26.347Z"),
        updatedAt: new Date("2025-12-18T09:26:26.347Z"),
      },
      {
        id: "cmjb8lmvw00fuo001cj9kowui",
        code: "ES-KAG93AI30M",
        description: 'Serie | 6, American side by side, 178.7 x 90.8 cm, Inox-easyclean The NoFrost side-by-side fridge-freezer with ice and water dispenser and HomeBar: provides convenient access to your drinks Technical Data Energy Efficiency Class (Regulation (EU) 2017/1369): E Free-standing: Free-standing Number of compressors: 1 Number of independent cooling systems: 1 Width of the product: 908 mm Height: 1787 mm Depth of the product: 707 mm Net weight: 111.848 kg Dimensions of the packed product: 74.68 x 38.66 x 30.70',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("431900"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:27:28.797Z"),
        updatedAt: new Date("2025-12-18T09:27:28.797Z"),
      },
      {
        id: "cmjb8nl7j00g0o001fj7y7qpf",
        code: "ES-KIV38X22GB",
        description: 'Serie | 2, built-in fridge-freezer with freezer at bottom, 177.2 x 54.1 cmTechnical Data Built-in / Free-standing : Built-in Door panel options : Not possible Width of the appliance : 541 Depth (mm) : 545 Required niche size for installation (HxWxD) : 1775.0 x 562.0 x 550 Net weight (kg) : 56.913',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("290500"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:28:59.936Z"),
        updatedAt: new Date("2025-12-18T09:28:59.936Z"),
      },
      {
        id: "cmjb8oho800g6o001ozbl7e63",
        code: "ES-KUL15A60M",
        description: 'built-in fridge with freezer section 82 x  60 cm.',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("185000"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-18T09:29:42.008Z"),
        updatedAt: new Date("2025-12-18T09:29:42.008Z"),
      },
      {
        id: "cmjbts2140001o001jhu4hh8o",
        code: "MK-130-80",
        description: "Plastic Cutlary Tray",
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("5050"),
        costPrice: parsePrice("0"),
        image: null,
        status: "trash",
        createdAt: new Date("2025-12-18T19:20:20.297Z"),
        updatedAt: new Date("2025-12-18T19:20:40.253Z"),
      },
      {
        id: "cmjdvfx93000go001mxemhd2j",
        code: "ES-KSG7003AT (Golden Rose Series)",
        description: parseDescription('"1. 70L capacity 2. Oversized Window 3. damping hinge and Anti-Spill Grill/Tray design 4. three-step control mode 5. LED screen and cooking tips added 6. two LOW-E coating glass doors 7. 3D convection fan and Enameled surface of cavity and trays 8. Class A energy efficiency 9.Upgrade to LED lighting  9. 70 Liter"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("77800"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-20T05:42:25.815Z"),
        updatedAt: new Date("2025-12-20T05:42:25.815Z"),
      },
      {
        id: "cmjdvh1xz000mo001u55bqet0",
        code: "ES-MW ovens  HW25800K-E2 (SQ Series)   ",
        description: parseDescription('"1. Independent air passageway, having no influnce on cabinet and with no cooking odours 2. Microwave and Grill heating systems available 3. 15 smart cooking modes, One-click shortcut menu meets diverse needs 4. SQ series appliance  5. 25 Liter"'),
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("75500"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-20T05:43:18.552Z"),
        updatedAt: new Date("2025-12-20T05:43:18.552Z"),
      },
      {
        id: "cmjdvippt000so0017eog82wb",
        code: "ES-Steam oven  SCD42-C2T (Golden Rose Series)  ",
        description: '1.Enough steam——Double-effect steam technology 2.Large capacity——42L capacity 3.Easy-to-clean design——Effectively reduce water accumulation in the cavity 4.Prevent drippage——Auxiliary heating film 5.Precise Temperature Control System 6.Black tempered glass appearance  6. 42 Liter',
        unitId: "cmjadhczi0001o08s5u47x58x",
        unitPrice: parsePrice("75500"),
        costPrice: parsePrice("0"),
        image: null,
        status: "active",
        createdAt: new Date("2025-12-20T05:44:36.017Z"),
        updatedAt: new Date("2025-12-20T05:44:36.017Z"),
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
    console.log(`✅ SUCCESS: Seeded ${items.length} items (Chunk 5/5)`);
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

