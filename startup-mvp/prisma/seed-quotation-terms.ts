import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌱 SEEDING: Quotation Terms & TOS Templates");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
    });

    if (!adminUser) {
      throw new Error("No admin user found. Please run seed-users.ts first.");
    }

    console.log("🗑️  Removing existing quotation terms...");
    await prisma.quotationTerms.deleteMany({});

    const templates = [
      {
        title: "Standard Software Development Terms",
        content: `<h2>1. Scope of Services</h2>
<p>The Company will provide software development services as outlined in the project proposal. Any changes to the scope must be agreed upon in writing.</p>
<h2>2. Intellectual Property</h2>
<p>Upon full payment, all custom-developed source code and intellectual property rights will be transferred to the Client. The Company retains the right to use generic libraries and tools developed prior to or during the project.</p>
<h2>3. Confidentiality</h2>
<p>Both parties agree to keep all project-related information, business data, and trade secrets strictly confidential during and after the project.</p>
<h2>4. Warranty & Support</h2>
<p>A 30-day bug-fix warranty is provided after the final delivery. Extended maintenance and support agreements are available.</p>`,
        paymentTerms: `<h2>Payment Milestones</h2>
<ul>
  <li><strong>40% Deposit:</strong> Due upon project kick-off before work commences.</li>
  <li><strong>30% Milestone 1:</strong> Due upon delivery of the prototype / initial demo.</li>
  <li><strong>20% Milestone 2:</strong> Due upon completion of beta testing.</li>
  <li><strong>10% Final Payment:</strong> Due within 7 days of final deployment and approval.</li>
</ul>
<p>All invoices are due within 7 days of issue. A late payment fee of 1.5% per month may apply to overdue balances.</p>`,
        refundPolicy: `<h2>Refund Guidelines</h2>
<p>Deposits are non-refundable once design and development work has commenced. If the project is cancelled before work begins, a full refund minus a 10% administrative fee will be issued. Milestone payments are non-refundable once the corresponding milestone deliverables have been completed and delivered.</p>`,
        terminationPolicy: `<h2>Termination Conditions</h2>
<p>Either party may terminate this agreement with 14 days' written notice. Upon termination, the Client will be invoiced for all completed work up to the termination date, and any outstanding payments must be settled within 7 days. Intellectual property will only transfer if all outstanding invoices are fully paid.</p>`,
        status: "active",
        isDefault: true,
        createdBy: adminUser.id,
      },
      {
        title: "Standard Service & Maintenance Terms",
        content: `<h2>1. Service Standards</h2>
<p>The Company will perform maintenance and support services in a professional and diligent manner, adhering to industry best practices.</p>
<h2>2. System Access</h2>
<p>The Client agrees to provide necessary access credentials and environment access to enable the Company to perform regular maintenance safely.</p>
<h2>3. Response Times</h2>
<p>Support requests will be prioritized according to severity. Critical issues will receive a response within 4 hours, and standard issues within 24 hours during working days.</p>`,
        paymentTerms: `<h2>Recurring Subscription</h2>
<p>Maintenance services are billed on a monthly recurring basis in advance. Invoices are generated on the 1st of each month and due by the 10th of the same month. Automated credit card or bank transfer options are preferred.</p>`,
        refundPolicy: `<h2>Service Refunds</h2>
<p>No refunds will be issued for partial months of service. If a service level agreement (SLA) is breached, a service credit may be applied to the subsequent month's invoice, subject to review and mutual agreement.</p>`,
        terminationPolicy: `<h2>Cancellation & Termination</h2>
<p>This agreement may be terminated by either party with 30 days' written notice before the next billing cycle. No early termination fees apply. Upon termination, the Company will package and deliver any accumulated backup logs to the Client.</p>`,
        status: "active",
        isDefault: false,
        createdBy: adminUser.id,
      },
      {
        title: "Consulting & Advisory Retainer Terms",
        content: `<h2>1. Professional Consulting</h2>
<p>Consulting sessions and deliverables are based on professional expertise and analysis. Recommendations are advisory, and the implementation is the sole responsibility of the Client.</p>
<h2>2. Non-Solicitation</h2>
<p>During the agreement and for 1 year thereafter, neither party will solicit or hire any employees or contractors of the other party without prior written consent.</p>`,
        paymentTerms: `<h2>Consulting Fees</h2>
<p>Consulting hours are billed at a flat rate of $150/hour, or as per the custom retainer packages selected. Retainer packages are invoiced 100% upfront. Ad-hoc consulting hours are invoiced weekly and are due immediately upon receipt.</p>`,
        refundPolicy: `<h2>Consulting Refunds</h2>
<p>Consulting fees are fully non-refundable once hours have been delivered or sessions have taken place. Scheduled sessions must be rescheduled or cancelled at least 24 hours in advance, or the full fee will be charged.</p>`,
        terminationPolicy: `<h2>Consulting Termination</h2>
<p>Consulting agreements can be cancelled immediately by either party at any time. Any unused pre-paid retainer hours will be forfeited and are non-refundable.</p>`,
        status: "active",
        isDefault: false,
        createdBy: adminUser.id,
      },
    ];

    console.log("\n📄 Seeding terms...");
    for (const template of templates) {
      await prisma.quotationTerms.create({ data: template });
      console.log(`   ✓ ${template.title}`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCCESS: 3 Quotation Terms & TOS Templates seeded!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("\n❌ ERROR: Seeding failed!");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
