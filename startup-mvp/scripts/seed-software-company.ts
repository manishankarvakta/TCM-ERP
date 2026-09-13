import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedSoftwareCompanyMasterData() {
  console.log("🚀 Starting seeding master data for Software Development Company...");

  // 1. Employee Types
  const employeeTypesData = [
    {
      name: "Full-Time Permanent",
      code: "FT-PERM",
      description: "Full-time salaried software engineering & core operations staff",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Contract / Freelance",
      code: "CONTRACT",
      description: "Contractual developers, specialist technical consultants, and project staff",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Software Intern",
      code: "INTERN",
      description: "Trainee developers, software engineering interns, and co-op students",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Executive Leadership",
      code: "EXEC",
      description: "C-Level officers, Directors, and VP of Engineering",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Remote / Distributed",
      code: "REMOTE",
      description: "Offshore, nearshore, or fully remote engineering talent",
      status: "active",
      organizationId: "default-org",
    },
  ];

  for (const item of employeeTypesData) {
    await prisma.employeeType.upsert({
      where: { code: item.code },
      update: { name: item.name, description: item.description, status: item.status },
      create: item,
    }).catch((err) => console.warn(`Note: Could not seed EmployeeType ${item.code}:`, err.message));
  }
  console.log("✅ Employee Types seeded.");

  // 2. Departments
  const departmentsData = [
    {
      name: "Software Engineering",
      code: "ENG",
      description: "Frontend, backend, mobile, and full-stack development teams",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Product & UI/UX Design",
      code: "PROD-UI",
      description: "Product strategy, Figma UI/UX design systems, and user research",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Quality Assurance (QA)",
      code: "QA",
      description: "Software testing, automated QA pipelines, and performance security",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "DevOps & Cloud SRE",
      code: "DEVOPS",
      description: "CI/CD automation, cloud infrastructure (AWS/GCP), and Kubernetes",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "HR & People Operations",
      code: "HR",
      description: "Tech talent acquisition, developer recruitment, and culture ops",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Sales & Account Management",
      code: "SALES",
      description: "Client acquisition, project estimations, and solution engineering",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Finance & Operations",
      code: "FIN",
      description: "Financial management, client billing, and office administration",
      status: "active",
      organizationId: "default-org",
    },
  ];

  for (const item of departmentsData) {
    await prisma.department.upsert({
      where: { organizationId_code: { organizationId: "default-org", code: item.code } },
      update: { name: item.name, description: item.description, status: item.status },
      create: item,
    }).catch((err) => console.warn(`Note: Could not seed Department ${item.code}:`, err.message));
  }
  console.log("✅ Departments seeded.");

  // 3. Designations
  const designationsData = [
    {
      name: "Chief Technology Officer (CTO)",
      code: "CTO",
      description: "Technology vision, enterprise architecture, and technical leadership",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "VP of Engineering",
      code: "VP-ENG",
      description: "Engineering delivery, team scaling, and software quality management",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Principal Software Architect",
      code: "ARCH",
      description: "High-level software architecture, system design, and technical roadmaps",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Senior Full-Stack Engineer",
      code: "SR-FS",
      description: "Full-stack web application development, code review, and mentoring",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Frontend Engineer (React/Next.js)",
      code: "FE-DEV",
      description: "Modern UI components, state management, and web application design",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Backend Engineer (Node/Python)",
      code: "BE-DEV",
      description: "RESTful & GraphQL API design, microservices, and database optimization",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Mobile App Developer (React Native/Flutter)",
      code: "MOB-DEV",
      description: "Cross-platform mobile application engineering for iOS and Android",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "DevOps / SRE Engineer",
      code: "DEVOPS-ENG",
      description: "Infrastructure as Code, Docker containers, AWS deployments, and monitoring",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "QA Automation Engineer",
      code: "QA-ENG",
      description: "End-to-end automated testing (Playwright/Cypress) and release verification",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Lead UI/UX Designer",
      code: "UIUX-LEAD",
      description: "Product design systems, Figma prototypes, and user journey mapping",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Senior Product Manager",
      code: "SR-PM",
      description: "Sprint planning, backlog grooming, and product feature specs",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Junior Software Engineer",
      code: "JR-ENG",
      description: "Feature development, bug fixes, and unit test coverage",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Technical Recruiter & HR Lead",
      code: "HR-LEAD",
      description: "Developer recruitment, technical interviewing, and employee engagement",
      status: "active",
      organizationId: "default-org",
    },
    {
      name: "Software Solutions Consultant",
      code: "SOL-CONS",
      description: "B2B client technical consultation, RFPs, and solution architecture",
      status: "active",
      organizationId: "default-org",
    },
  ];

  for (const item of designationsData) {
    await prisma.designation.upsert({
      where: { code: item.code },
      update: { name: item.name, description: item.description, status: item.status },
      create: item,
    }).catch((err) => console.warn(`Note: Could not seed Designation ${item.code}:`, err.message));
  }
  console.log("✅ Designations seeded.");

  console.log("🎉 All Software Company Master Data successfully seeded!");
}

seedSoftwareCompanyMasterData()
  .catch((e) => {
    console.error("❌ Error seeding master data:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
