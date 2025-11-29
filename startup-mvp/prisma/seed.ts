import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Create sample users with hashed passwords
  const users = [
    {
      name: "Admin User",
      email: "admin@example.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
    },
    {
      name: "John Doe",
      email: "john@example.com",
      password: await bcrypt.hash("password123", 10),
      role: "user",
    },
    {
      name: "Jane Smith",
      email: "jane@example.com",
      password: await bcrypt.hash("password123", 10),
      role: "user",
    },
  ];

  // Create or update users
  let adminUser: { id: string } | null = null;
  for (const user of users) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...user,
      },
    });
    console.log(`✅ Created/Updated user: ${createdUser.email}`);

    // Store admin user for creating units
    if (createdUser.role === "admin") {
      adminUser = { id: createdUser.id };
    }

    // Create some user logs for each user
    const logActions = ["LOGIN", "LOGOUT", "PROFILE_UPDATE", "SETTINGS_CHANGE"];
    
    for (let i = 0; i < 5; i++) {
      const action = logActions[Math.floor(Math.random() * logActions.length)];
      await prisma.userLog.create({
        data: {
          userId: createdUser.id,
          action,
          details: `${action} action performed`,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
    }
  }

  // Create sample units
  if (adminUser) {
    const units = [
      // Basic weight units
      { symbol: "kg", details: "Kilogram" },
      { symbol: "g", details: "Gram" },
      { symbol: "mg", details: "Milligram" },
      { symbol: "lb", details: "Pound" },
      { symbol: "oz", details: "Ounce" },
      
      // Basic length units
      { symbol: "m", details: "Meter" },
      { symbol: "cm", details: "Centimeter" },
      { symbol: "mm", details: "Millimeter" },
      { symbol: "km", details: "Kilometer" },
      { symbol: "ft", details: "Foot" },
      { symbol: "in", details: "Inch" },
      { symbol: "yd", details: "Yard" },
      
      // Area units (interior industry)
      { symbol: "sqm", details: "Square Meter" },
      { symbol: "sqft", details: "Square Foot" },
      { symbol: "sqin", details: "Square Inch" },
      { symbol: "sqyd", details: "Square Yard" },
      
      // Volume units
      { symbol: "L", details: "Liter" },
      { symbol: "mL", details: "Milliliter" },
      { symbol: "gal", details: "Gallon" },
      { symbol: "qt", details: "Quart" },
      { symbol: "pt", details: "Pint" },
      { symbol: "fl oz", details: "Fluid Ounce" },
      { symbol: "cu m", details: "Cubic Meter" },
      { symbol: "cu ft", details: "Cubic Foot" },
      
      // Linear measurements (interior industry)
      { symbol: "lm", details: "Linear Meter" },
      { symbol: "lf", details: "Linear Foot" },
      { symbol: "rm", details: "Running Meter" },
      { symbol: "rf", details: "Running Foot" },
      
      // Interior industry specific units
      { symbol: "roll", details: "Roll" },
      { symbol: "sheet", details: "Sheet" },
      { symbol: "panel", details: "Panel" },
      { symbol: "tile", details: "Tile" },
      { symbol: "board", details: "Board" },
      { symbol: "bf", details: "Board Foot" },
      { symbol: "sq", details: "Square" },
      { symbol: "bundle", details: "Bundle" },
      { symbol: "carton", details: "Carton" },
      { symbol: "case", details: "Case" },
      
      // Count/Quantity units
      { symbol: "pcs", details: "Pieces" },
      { symbol: "box", details: "Box" },
      { symbol: "pack", details: "Pack" },
      { symbol: "set", details: "Set" },
      { symbol: "pair", details: "Pair" },
      { symbol: "dozen", details: "Dozen" },
      { symbol: "lot", details: "Lot" },
      { symbol: "unit", details: "Unit" },
    ];

    const unitMap = new Map<string, string>();
    for (const unit of units) {
      const createdUnit = await prisma.unit.upsert({
        where: { 
          symbol: unit.symbol,
        },
        update: {},
        create: {
          symbol: unit.symbol,
          details: unit.details,
          status: "active",
          createdBy: adminUser.id,
        },
      });
      unitMap.set(unit.symbol, createdUnit.id);
      console.log(`✅ Created/Updated unit: ${createdUnit.symbol} - ${createdUnit.details}`);
    }

    // Create sample categories
    const categories = [
      { name: "Furniture", description: "Furniture items including sofas, tables, chairs, and other furniture pieces", status: "active" },
      { name: "Flooring", description: "Flooring materials including hardwood, tiles, carpet, and vinyl", status: "active" },
      { name: "Paint", description: "Paint and finishes including interior, exterior, primer, and varnish", status: "active" },
      { name: "Lighting", description: "Lighting fixtures including ceiling lights, chandeliers, and LED strips", status: "active" },
      { name: "Wall Coverings", description: "Wall coverings including wallpaper, wall panels, and decorative molding", status: "active" },
      { name: "Hardware", description: "Hardware and accessories including door handles, hinges, and screws", status: "active" },
      { name: "Fabrics", description: "Fabrics and textiles including curtain fabric, upholstery, and cushion covers", status: "active" },
      { name: "Bathroom", description: "Bathroom fixtures and accessories including tiles, glass panels, and mirrors", status: "active" },
      { name: "Kitchen", description: "Kitchen fixtures and accessories including cabinets, countertops, and faucets", status: "active" },
      { name: "Windows", description: "Windows and window treatments including curtains, blinds, and window frames", status: "active" },
      { name: "Doors", description: "Doors and door accessories including interior doors, exterior doors, and door frames", status: "active" },
      { name: "Ceiling", description: "Ceiling materials and treatments including ceiling tiles, panels, and decorative elements", status: "active" },
      { name: "Accessories", description: "Decorative accessories and home decor items", status: "active" },
      { name: "Outdoor", description: "Outdoor furniture and accessories", status: "inactive" },
    ];

    const categoryMap = new Map<string, string>();
    for (const category of categories) {
      try {
        const existingCategory = await prisma.category.findFirst({
          where: { name: category.name },
        });

        if (existingCategory) {
          await prisma.category.update({
            where: { id: existingCategory.id },
            data: {
              description: category.description,
              status: category.status,
            },
          });
          categoryMap.set(category.name, existingCategory.id);
          console.log(`✅ Updated category: ${category.name} (${category.status})`);
        } else {
          const createdCategory = await prisma.category.create({
            data: {
              name: category.name,
              description: category.description,
              status: category.status,
            },
          });
          categoryMap.set(category.name, createdCategory.id);
          console.log(`✅ Created category: ${category.name} (${category.status})`);
        }
      } catch (error) {
        console.error(`❌ Failed to create/update category ${category.name}:`, error);
      }
    }

    // Create sample organizations
    const organizations = [
      {
        name: "Elite Interior Design Studio",
        details: "Premium interior design services specializing in luxury residential and commercial spaces",
        address: "123 Design Avenue, Suite 500, New York, NY 10001",
        phone: "+1 (555) 123-4567",
        email: "info@eliteinteriors.com",
        website: "https://www.eliteinteriors.com",
        logo: null,
        status: "active",
      },
      {
        name: "Modern Living Solutions",
        details: "Contemporary interior design and home renovation services",
        address: "456 Modern Street, Los Angeles, CA 90001",
        phone: "+1 (555) 234-5678",
        email: "contact@modernliving.com",
        website: "https://www.modernliving.com",
        logo: null,
        status: "active",
      },
      {
        name: "Classic Home Interiors",
        details: "Traditional and classic interior design with a focus on timeless elegance",
        address: "789 Classic Boulevard, Chicago, IL 60601",
        phone: "+1 (555) 345-6789",
        email: "hello@classichome.com",
        website: "https://www.classichome.com",
        logo: null,
        status: "active",
      },
      {
        name: "Space Design Co.",
        details: "Commercial and office space design specialists",
        address: "321 Business Park, Houston, TX 77001",
        phone: "+1 (555) 456-7890",
        email: "info@spacedesign.com",
        website: "https://www.spacedesign.com",
        logo: null,
        status: "active",
      },
      {
        name: "Eco-Friendly Interiors",
        details: "Sustainable and eco-conscious interior design solutions",
        address: "654 Green Way, Seattle, WA 98101",
        phone: "+1 (555) 567-8901",
        email: "contact@ecofriendly.com",
        website: "https://www.ecofriendly.com",
        logo: null,
        status: "active",
      },
      {
        name: "Luxury Design Group",
        details: "High-end residential and hospitality interior design",
        address: "987 Luxury Lane, Miami, FL 33101",
        phone: "+1 (555) 678-9012",
        email: "info@luxurydesign.com",
        website: "https://www.luxurydesign.com",
        logo: null,
        status: "active",
      },
      {
        name: "Minimalist Spaces",
        details: "Minimalist and modern interior design with clean lines",
        address: "147 Minimal Street, San Francisco, CA 94101",
        phone: "+1 (555) 789-0123",
        email: "hello@minimalistspaces.com",
        website: "https://www.minimalistspaces.com",
        logo: null,
        status: "active",
      },
      {
        name: "Cozy Home Design",
        details: "Warm and inviting interior design for family homes",
        address: "258 Cozy Avenue, Boston, MA 02101",
        phone: "+1 (555) 890-1234",
        email: "info@cozyhome.com",
        website: "https://www.cozyhome.com",
        logo: null,
        status: "active",
      },
      {
        name: "Artisan Interiors",
        details: "Custom and handcrafted interior design elements",
        address: "369 Artisan Road, Portland, OR 97201",
        phone: "+1 (555) 901-2345",
        email: "contact@artisaninteriors.com",
        website: "https://www.artisaninteriors.com",
        logo: null,
        status: "inactive",
      },
      {
        name: "Urban Design Studio",
        details: "Urban and industrial style interior design",
        address: "741 Urban Plaza, Brooklyn, NY 11201",
        phone: "+1 (555) 012-3456",
        email: "info@urbandesign.com",
        website: "https://www.urbandesign.com",
        logo: null,
        status: "active",
      },
    ];

    for (const org of organizations) {
      try {
        const existingOrg = await prisma.organization.findFirst({
          where: { name: org.name },
        });

        if (existingOrg) {
          await prisma.organization.update({
            where: { id: existingOrg.id },
            data: {
              details: org.details,
              address: org.address,
              phone: org.phone,
              email: org.email,
              website: org.website,
              logo: org.logo,
              status: org.status,
            },
          });
          console.log(`✅ Updated organization: ${org.name} (${org.status})`);
        } else {
          await prisma.organization.create({
            data: {
              name: org.name,
              details: org.details,
              address: org.address,
              phone: org.phone,
              email: org.email,
              website: org.website,
              logo: org.logo,
              status: org.status,
              createdBy: adminUser.id,
            },
          });
          console.log(`✅ Created organization: ${org.name} (${org.status})`);
        }
      } catch (error) {
        console.error(`❌ Failed to create/update organization ${org.name}:`, error);
      }
    }

    // Create sample clients
    const clients = [
      {
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1 (555) 111-2222",
        address: "123 Oak Street",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "USA",
        company: "Johnson & Associates",
        image: null,
        status: "active",
      },
      {
        name: "Michael Chen",
        email: "michael.chen@email.com",
        phone: "+1 (555) 222-3333",
        address: "456 Maple Avenue",
        city: "Los Angeles",
        state: "CA",
        zip: "90001",
        country: "USA",
        company: "Chen Enterprises",
        image: null,
        status: "active",
      },
      {
        name: "Emily Rodriguez",
        email: "emily.rodriguez@email.com",
        phone: "+1 (555) 333-4444",
        address: "789 Pine Road",
        city: "Chicago",
        state: "IL",
        zip: "60601",
        country: "USA",
        company: null,
        image: null,
        status: "active",
      },
      {
        name: "David Thompson",
        email: "david.thompson@email.com",
        phone: "+1 (555) 444-5555",
        address: "321 Elm Boulevard",
        city: "Houston",
        state: "TX",
        zip: "77001",
        country: "USA",
        company: "Thompson Design Studio",
        image: null,
        status: "active",
      },
      {
        name: "Jessica Williams",
        email: "jessica.williams@email.com",
        phone: "+1 (555) 555-6666",
        address: "654 Cedar Lane",
        city: "Seattle",
        state: "WA",
        zip: "98101",
        country: "USA",
        company: null,
        image: null,
        status: "active",
      },
      {
        name: "Robert Martinez",
        email: "robert.martinez@email.com",
        phone: "+1 (555) 666-7777",
        address: "987 Birch Street",
        city: "Miami",
        state: "FL",
        zip: "33101",
        country: "USA",
        company: "Martinez Interiors LLC",
        image: null,
        status: "active",
      },
      {
        name: "Amanda Brown",
        email: "amanda.brown@email.com",
        phone: "+1 (555) 777-8888",
        address: "147 Spruce Avenue",
        city: "San Francisco",
        state: "CA",
        zip: "94101",
        country: "USA",
        company: null,
        image: null,
        status: "active",
      },
      {
        name: "James Wilson",
        email: "james.wilson@email.com",
        phone: "+1 (555) 888-9999",
        address: "258 Willow Drive",
        city: "Boston",
        state: "MA",
        zip: "02101",
        country: "USA",
        company: "Wilson Home Solutions",
        image: null,
        status: "active",
      },
      {
        name: "Lisa Anderson",
        email: "lisa.anderson@email.com",
        phone: "+1 (555) 999-0000",
        address: "369 Ash Court",
        city: "Portland",
        state: "OR",
        zip: "97201",
        country: "USA",
        company: null,
        image: null,
        status: "inactive",
      },
      {
        name: "Christopher Taylor",
        email: "christopher.taylor@email.com",
        phone: "+1 (555) 000-1111",
        address: "741 Poplar Way",
        city: "Brooklyn",
        state: "NY",
        zip: "11201",
        country: "USA",
        company: "Taylor Design Group",
        image: null,
        status: "active",
      },
      {
        name: "Michelle Garcia",
        email: "michelle.garcia@email.com",
        phone: "+1 (555) 101-2020",
        address: "852 Magnolia Street",
        city: "Denver",
        state: "CO",
        zip: "80201",
        country: "USA",
        company: null,
        image: null,
        status: "active",
      },
      {
        name: "Daniel Lee",
        email: "daniel.lee@email.com",
        phone: "+1 (555) 202-3030",
        address: "963 Cherry Boulevard",
        city: "Atlanta",
        state: "GA",
        zip: "30301",
        country: "USA",
        company: "Lee Interior Design",
        image: null,
        status: "active",
      },
      {
        name: "Nicole White",
        email: "nicole.white@email.com",
        phone: "+1 (555) 303-4040",
        address: "159 Walnut Avenue",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
        country: "USA",
        company: null,
        image: null,
        status: "inactive",
      },
      {
        name: "Kevin Harris",
        email: "kevin.harris@email.com",
        phone: "+1 (555) 404-5050",
        address: "357 Hickory Road",
        city: "Dallas",
        state: "TX",
        zip: "75201",
        country: "USA",
        company: "Harris Design Co.",
        image: null,
        status: "active",
      },
      {
        name: "Rachel Clark",
        email: "rachel.clark@email.com",
        phone: "+1 (555) 505-6060",
        address: "468 Sycamore Lane",
        city: "San Diego",
        state: "CA",
        zip: "92101",
        country: "USA",
        company: null,
        image: null,
        status: "active",
      },
    ];

    for (const client of clients) {
      try {
        const existingClient = await prisma.client.findFirst({
          where: { email: client.email },
        });

        if (existingClient) {
          await prisma.client.update({
            where: { id: existingClient.id },
            data: {
              name: client.name,
              phone: client.phone,
              address: client.address,
              city: client.city,
              state: client.state,
              zip: client.zip,
              country: client.country,
              company: client.company,
              image: client.image,
              status: client.status,
            },
          });
          console.log(`✅ Updated client: ${client.name || client.email} (${client.status})`);
        } else {
          await prisma.client.create({
            data: {
              name: client.name,
              email: client.email,
              phone: client.phone,
              address: client.address,
              city: client.city,
              state: client.state,
              zip: client.zip,
              country: client.country,
              company: client.company,
              image: client.image,
              status: client.status,
              createdBy: adminUser.id,
            },
          });
          console.log(`✅ Created client: ${client.name || client.email} (${client.status})`);
        }
      } catch (error) {
        console.error(`❌ Failed to create/update client ${client.email}:`, error);
      }
    }

    // Create sample suppliers
    const suppliers = [
      {
        name: "Premium Materials Co.",
        email: "contact@premiummaterials.com",
        phone: "+1 (555) 111-0000",
        address: "100 Supply Street",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "USA",
        company: "Premium Materials Co.",
        image: null,
        status: "active",
      },
      {
        name: "Global Furniture Supply",
        email: "info@globalfurniture.com",
        phone: "+1 (555) 222-0000",
        address: "200 Warehouse Avenue",
        city: "Los Angeles",
        state: "CA",
        zip: "90001",
        country: "USA",
        company: "Global Furniture Supply",
        image: null,
        status: "active",
      },
      {
        name: "Interior Hardware Solutions",
        email: "sales@interiorhardware.com",
        phone: "+1 (555) 333-0000",
        address: "300 Hardware Lane",
        city: "Chicago",
        state: "IL",
        zip: "60601",
        country: "USA",
        company: "Interior Hardware Solutions",
        image: null,
        status: "active",
      },
      {
        name: "Luxury Textiles Inc.",
        email: "hello@luxurytextiles.com",
        phone: "+1 (555) 444-0000",
        address: "400 Fabric Boulevard",
        city: "Houston",
        state: "TX",
        zip: "77001",
        country: "USA",
        company: "Luxury Textiles Inc.",
        image: null,
        status: "active",
      },
      {
        name: "Lighting Solutions Pro",
        email: "info@lightingsolutions.com",
        phone: "+1 (555) 555-0000",
        address: "500 Bright Way",
        city: "Seattle",
        state: "WA",
        zip: "98101",
        country: "USA",
        company: "Lighting Solutions Pro",
        image: null,
        status: "active",
      },
      {
        name: "Flooring Experts LLC",
        email: "contact@flooringexperts.com",
        phone: "+1 (555) 666-0000",
        address: "600 Floor Street",
        city: "Miami",
        state: "FL",
        zip: "33101",
        country: "USA",
        company: "Flooring Experts LLC",
        image: null,
        status: "active",
      },
      {
        name: "Paint & Finishes Direct",
        email: "sales@paintfinishes.com",
        phone: "+1 (555) 777-0000",
        address: "700 Color Avenue",
        city: "San Francisco",
        state: "CA",
        zip: "94101",
        country: "USA",
        company: "Paint & Finishes Direct",
        image: null,
        status: "active",
      },
      {
        name: "Wall Coverings Plus",
        email: "info@wallcoverings.com",
        phone: "+1 (555) 888-0000",
        address: "800 Wall Drive",
        city: "Boston",
        state: "MA",
        zip: "02101",
        country: "USA",
        company: "Wall Coverings Plus",
        image: null,
        status: "active",
      },
      {
        name: "Kitchen & Bath Supply",
        email: "hello@kitchenbath.com",
        phone: "+1 (555) 999-0000",
        address: "900 Fixture Road",
        city: "Portland",
        state: "OR",
        zip: "97201",
        country: "USA",
        company: "Kitchen & Bath Supply",
        image: null,
        status: "inactive",
      },
      {
        name: "Decorative Accessories Co.",
        email: "contact@decorativeaccessories.com",
        phone: "+1 (555) 000-1111",
        address: "1000 Decor Plaza",
        city: "Brooklyn",
        state: "NY",
        zip: "11201",
        country: "USA",
        company: "Decorative Accessories Co.",
        image: null,
        status: "active",
      },
      {
        name: "Outdoor Living Supply",
        email: "info@outdoorliving.com",
        phone: "+1 (555) 101-2020",
        address: "1100 Outdoor Way",
        city: "Denver",
        state: "CO",
        zip: "80201",
        country: "USA",
        company: "Outdoor Living Supply",
        image: null,
        status: "active",
      },
      {
        name: "Window Treatments Direct",
        email: "sales@windowtreatments.com",
        phone: "+1 (555) 202-3030",
        address: "1200 Window Boulevard",
        city: "Atlanta",
        state: "GA",
        zip: "30301",
        country: "USA",
        company: "Window Treatments Direct",
        image: null,
        status: "active",
      },
      {
        name: "Ceiling Solutions Inc.",
        email: "contact@ceilingsolutions.com",
        phone: "+1 (555) 303-4040",
        address: "1300 Ceiling Avenue",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
        country: "USA",
        company: "Ceiling Solutions Inc.",
        image: null,
        status: "inactive",
      },
      {
        name: "Door & Frame Supply",
        email: "info@doorframe.com",
        phone: "+1 (555) 404-5050",
        address: "1400 Door Street",
        city: "Dallas",
        state: "TX",
        zip: "75201",
        country: "USA",
        company: "Door & Frame Supply",
        image: null,
        status: "active",
      },
      {
        name: "Artisan Materials Co.",
        email: "hello@artisanmaterials.com",
        phone: "+1 (555) 505-6060",
        address: "1500 Craft Lane",
        city: "San Diego",
        state: "CA",
        zip: "92101",
        country: "USA",
        company: "Artisan Materials Co.",
        image: null,
        status: "active",
      },
    ];

    for (const supplier of suppliers) {
      try {
        const existingSupplier = await prisma.supplier.findFirst({
          where: { email: supplier.email },
        });

        if (existingSupplier) {
          await prisma.supplier.update({
            where: { id: existingSupplier.id },
            data: {
              name: supplier.name,
              phone: supplier.phone,
              address: supplier.address,
              city: supplier.city,
              state: supplier.state,
              zip: supplier.zip,
              country: supplier.country,
              company: supplier.company,
              image: supplier.image,
              status: supplier.status,
            },
          });
          console.log(`✅ Updated supplier: ${supplier.name || supplier.email} (${supplier.status})`);
        } else {
          await prisma.supplier.create({
            data: {
              name: supplier.name,
              email: supplier.email,
              phone: supplier.phone,
              address: supplier.address,
              city: supplier.city,
              state: supplier.state,
              zip: supplier.zip,
              country: supplier.country,
              company: supplier.company,
              image: supplier.image,
              status: supplier.status,
              createdBy: adminUser.id,
            },
          });
          console.log(`✅ Created supplier: ${supplier.name || supplier.email} (${supplier.status})`);
        }
      } catch (error) {
        console.error(`❌ Failed to create/update supplier ${supplier.email}:`, error);
      }
    }

    // Create sample items
    const items = [
      // Furniture Items
      { code: "FURN-001", description: "Modern Sofa Set 3-Seater", unitId: unitMap.get("pcs")!, unitPrice: 1250.00, categoryName: "Furniture", status: "active" },
      { code: "FURN-002", description: "Dining Table 6-Seater", unitId: unitMap.get("pcs")!, unitPrice: 850.00, categoryName: "Furniture", status: "active" },
      { code: "FURN-003", description: "Office Chair Ergonomic", unitId: unitMap.get("pcs")!, unitPrice: 320.00, categoryName: "Furniture", status: "active" },
      { code: "FURN-004", description: "Coffee Table Glass Top", unitId: unitMap.get("pcs")!, unitPrice: 450.00, categoryName: "Furniture", status: "active" },
      
      // Flooring Items
      { code: "FLR-001", description: "Hardwood Flooring Oak", unitId: unitMap.get("sqft")!, unitPrice: 12.50, categoryName: "Flooring", status: "active" },
      { code: "FLR-002", description: "Ceramic Tile 12x12", unitId: unitMap.get("sqft")!, unitPrice: 8.75, categoryName: "Flooring", status: "active" },
      { code: "FLR-003", description: "Carpet Premium", unitId: unitMap.get("sqyd")!, unitPrice: 35.00, categoryName: "Flooring", status: "active" },
      { code: "FLR-004", description: "Vinyl Plank Flooring", unitId: unitMap.get("sqft")!, unitPrice: 6.25, categoryName: "Flooring", status: "inactive" },
      
      // Paint & Finishes
      { code: "PNT-001", description: "Interior Paint Premium White", unitId: unitMap.get("gal")!, unitPrice: 45.00, categoryName: "Paint", status: "active" },
      { code: "PNT-002", description: "Exterior Paint Weatherproof", unitId: unitMap.get("gal")!, unitPrice: 52.00, categoryName: "Paint", status: "active" },
      { code: "PNT-003", description: "Primer Base Coat", unitId: unitMap.get("gal")!, unitPrice: 28.00, categoryName: "Paint", status: "active" },
      { code: "PNT-004", description: "Varnish Clear Gloss", unitId: unitMap.get("qt")!, unitPrice: 18.50, categoryName: "Paint", status: "active" },
      
      // Lighting
      { code: "LGT-001", description: "LED Ceiling Light 12W", unitId: unitMap.get("pcs")!, unitPrice: 25.00, categoryName: "Lighting", status: "active" },
      { code: "LGT-002", description: "Chandelier 6-Light", unitId: unitMap.get("pcs")!, unitPrice: 350.00, categoryName: "Lighting", status: "active" },
      { code: "LGT-003", description: "Track Lighting Kit", unitId: unitMap.get("set")!, unitPrice: 125.00, categoryName: "Lighting", status: "active" },
      { code: "LGT-004", description: "LED Strip Light 5m", unitId: unitMap.get("roll")!, unitPrice: 45.00, categoryName: "Lighting", status: "inactive" },
      
      // Wall Coverings
      { code: "WAL-001", description: "Wallpaper Premium Pattern", unitId: unitMap.get("roll")!, unitPrice: 65.00, categoryName: "Wall Coverings", status: "active" },
      { code: "WAL-002", description: "Wall Panel MDF", unitId: unitMap.get("sqft")!, unitPrice: 15.00, categoryName: "Wall Coverings", status: "active" },
      { code: "WAL-003", description: "Decorative Molding", unitId: unitMap.get("lf")!, unitPrice: 8.50, categoryName: "Wall Coverings", status: "active" },
      
      // Hardware & Accessories
      { code: "HRD-001", description: "Door Handle Set Chrome", unitId: unitMap.get("set")!, unitPrice: 35.00, categoryName: "Hardware", status: "active" },
      { code: "HRD-002", description: "Cabinet Hinge Soft Close", unitId: unitMap.get("pair")!, unitPrice: 12.00, categoryName: "Hardware", status: "active" },
      { code: "HRD-003", description: "Drawer Slide 18 inch", unitId: unitMap.get("pair")!, unitPrice: 22.00, categoryName: "Hardware", status: "active" },
      { code: "HRD-004", description: "Screws Assorted Pack", unitId: unitMap.get("box")!, unitPrice: 15.00, categoryName: "Hardware", status: "active" },
      
      // Fabrics & Textiles
      { code: "FAB-001", description: "Curtain Fabric Premium", unitId: unitMap.get("yd")!, unitPrice: 28.00, categoryName: "Fabrics", status: "active" },
      { code: "FAB-002", description: "Upholstery Fabric", unitId: unitMap.get("yd")!, unitPrice: 35.00, categoryName: "Fabrics", status: "active" },
      { code: "FAB-003", description: "Cushion Cover Set", unitId: unitMap.get("set")!, unitPrice: 45.00, categoryName: "Fabrics", status: "active" },
      
      // Bathroom
      { code: "BTH-001", description: "Bathroom Tile 8x8", unitId: unitMap.get("sqft")!, unitPrice: 9.50, categoryName: "Bathroom", status: "active" },
      { code: "BTH-002", description: "Shower Glass Panel", unitId: unitMap.get("sqft")!, unitPrice: 85.00, categoryName: "Bathroom", status: "active" },
      { code: "BTH-003", description: "Vanity Mirror", unitId: unitMap.get("pcs")!, unitPrice: 125.00, categoryName: "Bathroom", status: "active" },
      
      // Kitchen
      { code: "KIT-001", description: "Kitchen Cabinet Base", unitId: unitMap.get("lf")!, unitPrice: 150.00, categoryName: "Kitchen", status: "active" },
      { code: "KIT-002", description: "Countertop Granite", unitId: unitMap.get("sqft")!, unitPrice: 75.00, categoryName: "Kitchen", status: "active" },
      { code: "KIT-003", description: "Kitchen Faucet Chrome", unitId: unitMap.get("pcs")!, unitPrice: 180.00, categoryName: "Kitchen", status: "active" },
    ];

    for (const item of items) {
      try {
        const categoryId = categoryMap.get(item.categoryName) || null;
        const createdItem = await prisma.item.upsert({
          where: { 
            code: item.code,
          },
          update: {
            status: item.status, // Update status if item exists
            categoryId: categoryId, // Update categoryId if item exists
          },
          create: {
            code: item.code,
            description: item.description,
            unitId: item.unitId,
            unitPrice: item.unitPrice,
            categoryId: categoryId,
            status: item.status,
          },
        });
        console.log(`✅ Created/Updated item: ${createdItem.code} - ${createdItem.description} (${item.status})`);
      } catch (error) {
        console.error(`❌ Failed to create item ${item.code}:`, error);
      }
    }
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

