import { PrismaClient, SectionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Software Development Proposal...');

  // 1. Get a Client, Organization, and User to link to
  const client = await prisma.client.findFirst();
  const org = await prisma.organization.findFirst();
  const user = await prisma.user.findFirst();

  if (!client || !user || !org) {
    console.error('Missing Client, User, or Organization in DB. Run basic CRM seed first.');
    return;
  }

  // 2. Generate a unique Quotation Number
  const quoteNum = `SW-PROP-${Date.now().toString().slice(-6)}`;

  // 3. Create the Quotation with Sections
  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber: quoteNum,
      subject: 'Software Development & CRM Implementation',
      clientId: client.id,
      organizationId: org.id,
      submittedById: user.id,
      total: 125000,
      grandTotal: 125000,
      coverLetter: 'Dear Sir/Madam,\nWe are thrilled to present this proposal for your custom Software Development project. Our team is ready to deliver a scalable, robust, and modern solution tailored to your exact business needs.',
      
      Section: {
        create: [
          {
            sectionType: SectionType.COVER,
            title: 'Software Development Proposal',
            sortOrder: 1,
            displayOrder: 1,
            note: 'Confidential Document'
          },
          {
            sectionType: SectionType.PROJECT_SUMMARY,
            title: 'Project Overview',
            sortOrder: 2,
            displayOrder: 2,
            note: 'The client requires a fully customized CRM and web portal to streamline their daily operations, automate invoicing, and enhance user engagement. We propose a robust tech stack utilizing Next.js, React, Node, and PostgreSQL.'
          },
          {
            sectionType: SectionType.SCOPE,
            title: 'Scope of Work',
            sortOrder: 3,
            displayOrder: 3,
            note: 'Phase 1: UI/UX Design & Prototyping.\nPhase 2: Core Database & API Development.\nPhase 3: Frontend Web Portal Implementation.\nPhase 4: Testing, QA, and Deployment.\nPhase 5: 30 days of post-launch stabilization support.'
          },
          {
            sectionType: SectionType.PRICING,
            title: 'Investment & Pricing',
            sortOrder: 4,
            displayOrder: 4,
            total: 125000,
            grandTotal: 125000,
            QuotationItem: {
              create: [
                {
                  sl: 1,
                  code: 'UI-UX',
                  description: 'UI/UX Design for Web Application (Figma)',
                  unit: 'Lump Sum',
                  unitPrice: 20000,
                  quantity: 1,
                  amount: 20000,
                  sortOrder: 1
                },
                {
                  sl: 2,
                  code: 'DEV-FE',
                  description: 'Frontend Web Development (React/Next.js)',
                  unit: 'Hours',
                  unitPrice: 200,
                  quantity: 200,
                  amount: 40000,
                  sortOrder: 2
                },
                {
                  sl: 3,
                  code: 'DEV-BE',
                  description: 'Backend API & Database (Node.js/Prisma)',
                  unit: 'Hours',
                  unitPrice: 250,
                  quantity: 200,
                  amount: 50000,
                  sortOrder: 3
                },
                {
                  sl: 4,
                  code: 'DEV-QA',
                  description: 'Quality Assurance & Testing',
                  unit: 'Lump Sum',
                  unitPrice: 15000,
                  quantity: 1,
                  amount: 15000,
                  sortOrder: 4
                }
              ]
            }
          },
          {
            sectionType: SectionType.TIMELINE,
            title: 'Implementation Timeline',
            sortOrder: 5,
            displayOrder: 5,
            note: 'Weeks 1-2: Discovery & Design.\nWeeks 3-8: Iterative Development Sprints.\nWeek 9: UAT & Testing.\nWeek 10: Production Launch.'
          },
          {
            sectionType: SectionType.LEGAL_TERMS,
            title: 'Terms & Conditions',
            sortOrder: 6,
            displayOrder: 6,
            note: '1. Payment Terms: 40% upfront, 40% upon UAT, 20% post-launch.\n2. Intellectual Property: Source code ownership transfers to the client upon final payment.\n3. Validity: This proposal is valid for 15 days from the date of issuance.'
          },
          {
            sectionType: SectionType.ACCEPTANCE,
            title: 'Proposal Acceptance',
            sortOrder: 7,
            displayOrder: 7,
            note: 'By signing below, the client agrees to the terms and scope defined in this proposal.'
          }
        ]
      }
    },
    include: {
      Section: {
        include: {
          QuotationItem: true
        }
      }
    }
  });

  console.log('✅ Created V4 Software Proposal Quotation:', quotation.quotationNumber);
  console.log(`Open in Browser: http://localhost:3000/dashboard/quotations/${quotation.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
