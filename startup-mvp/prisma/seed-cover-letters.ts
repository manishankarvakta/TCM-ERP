import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Cover Letter Templates");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
    });

    if (!adminUser) {
      throw new Error("No admin user found. Please run seed-users.ts first.");
    }

    console.log("🗑️  Removing existing cover letters...");
    await prisma.coverLetter.deleteMany({});

    // Placeholders used in templates:
    //   [Client Name]   → opportunity primary contact full name
    //   [Client Company] → client/company name
    //   [Project Name]  → quotation subject field
    //   [Your Name]     → submitted-by user's name
    //   [Your Company]  → organization name
    const templates = [
      {
        title: "Standard Professional Proposal",
        subject: "Proposal for [Project Name]",
        content: `Dear [Client Name],

It was a pleasure discussing your requirements for [Project Name]. Based on our conversation, we have prepared a comprehensive proposal that outlines our technical approach, timeline, and investment required to bring your vision to life.

Our team at [Your Company] is committed to delivering a high-quality, scalable solution tailored to your specific needs. We have extensive experience in building robust web applications and integrated systems.

Please find the detailed project scope and pricing in the sections below. We look forward to the possibility of working together.

Best regards,

[Your Name]
[Your Company]`,
        status: "active",
        createdBy: adminUser.id,
      },
      {
        title: "Quick Quotation",
        subject: "Price Quotation: [Project Name]",
        content: `Hi [Client Name],

Thank you for reaching out regarding [Project Name].

As requested, I have put together a quick quotation for the items or services discussed. Kindly review the pricing and scope below.

If you have any questions about the pricing or need any adjustments, please let me know.

Regards,

[Your Name]
[Your Company]`,
        status: "active",
        createdBy: adminUser.id,
      },
      {
        title: "Follow-up Proposal",
        subject: "Following up on our Proposal for [Project Name]",
        content: `Dear [Client Name],

I hope you're having a great week.

I'm following up on the proposal we sent over last week for [Project Name]. Since our last meeting, we've refined a few points to better align with your latest feedback.

Attached below is the updated version of the proposal for your review.

Please let me know if you would like to schedule a quick call to go over these changes.

Best,

[Your Name]
[Your Company]`,
        status: "active",
        createdBy: adminUser.id,
      },
      {
        title: "Expression of Interest",
        subject: "Expression of Interest: [Project Name]",
        content: `Dear [Client Name],

We have been following [Client Company]'s recent growth and are truly impressed with your direction. We believe our expertise could provide significant value to your upcoming initiatives.

Attached is a brief proposal outlining how [Your Company] can support your team in achieving the goals defined in [Project Name].

We would love the opportunity to introduce ourselves properly and discuss this further.

Sincerely,

[Your Name]
[Your Company]`,
        status: "active",
        createdBy: adminUser.id,
      },
      {
        title: "Project Kick-off Letter",
        subject: "Kick-off Confirmation: [Project Name]",
        content: `Hi [Client Name],

Great news — we are ready to begin work on [Project Name]!

To get started, we've prepared this initial outline with our immediate deliverables and timeline. Please review the attached sections and let us know if you have any questions before we proceed.

I'll reach out shortly to schedule our kick-off meeting.

Best regards,

[Your Name]
[Your Company]`,
        status: "active",
        createdBy: adminUser.id,
      },
    ];

    console.log("\n📄 Seeding templates...");
    for (const template of templates) {
      await prisma.coverLetter.create({ data: template });
      console.log(`   ✓ ${template.title}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: 5 Cover Letter Templates seeded!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nAvailable placeholders in templates:");
    console.log("  [Client Name]    → contact's full name (or client name if no contact)");
    console.log("  [Client Company] → client company / organization name");
    console.log("  [Project Name]   → quotation subject");
    console.log("  [Your Name]      → submitted-by user name");
    console.log("  [Your Company]   → your organization name");
  } catch (error) {
    console.error("\n❌ ERROR: Seeding failed!");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
