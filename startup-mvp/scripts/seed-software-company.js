"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
    // 3. Designations with Department Assignments
    const designationsData = [
        // Software Engineering
        {
            name: "Chief Technology Officer (CTO)",
            code: "CTO",
            departmentName: "Software Engineering",
            description: "Technology vision, enterprise architecture, and technical leadership",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "VP of Engineering",
            code: "VP-ENG",
            departmentName: "Software Engineering",
            description: "Engineering delivery, team scaling, and software quality management",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Principal Software Architect",
            code: "ARCH",
            departmentName: "Software Engineering",
            description: "High-level software architecture, system design, and technical roadmaps",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Engineering Manager",
            code: "ENG-MGR",
            departmentName: "Software Engineering",
            description: "Developer team management, sprint execution, and career growth coaching",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Lead Software Engineer",
            code: "LEAD-ENG",
            departmentName: "Software Engineering",
            description: "Technical squad lead, pull request reviews, and core module implementation",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Senior Full-Stack Engineer",
            code: "SR-FS",
            departmentName: "Software Engineering",
            description: "Full-stack web application development, code review, and mentoring",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Senior Frontend Engineer",
            code: "SR-FE",
            departmentName: "Software Engineering",
            description: "Next.js/React architecture, performance optimization, and web accessibility",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Senior Backend Engineer",
            code: "SR-BE",
            departmentName: "Software Engineering",
            description: "Node.js/Python microservices, PostgreSQL design, and API security",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Frontend Engineer (React/Next.js)",
            code: "FE-DEV",
            departmentName: "Software Engineering",
            description: "Modern UI components, state management, and web application design",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Backend Engineer (Node/Python)",
            code: "BE-DEV",
            departmentName: "Software Engineering",
            description: "RESTful & GraphQL API design, microservices, and database optimization",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Mobile App Developer (React Native/Flutter)",
            code: "MOB-DEV",
            departmentName: "Software Engineering",
            description: "Cross-platform mobile application engineering for iOS and Android",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "AI / Machine Learning Engineer",
            code: "AI-ENG",
            departmentName: "Software Engineering",
            description: "LLM integration, predictive analytics models, and AI agent pipelines",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Junior Software Engineer",
            code: "JR-ENG",
            departmentName: "Software Engineering",
            description: "Feature development, bug fixes, and unit test coverage",
            status: "active",
            organizationId: "default-org",
        },

        // Product & UI/UX Design
        {
            name: "Head of Product",
            code: "HEAD-PROD",
            departmentName: "Product & UI/UX Design",
            description: "Product portfolio strategy, user experience vision, and roadmap alignment",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Senior Product Manager",
            code: "SR-PM",
            departmentName: "Product & UI/UX Design",
            description: "Sprint planning, backlog grooming, and product feature specs",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Lead UI/UX Designer",
            code: "UIUX-LEAD",
            departmentName: "Product & UI/UX Design",
            description: "Product design systems, Figma prototypes, and user journey mapping",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Senior UI/UX Designer",
            code: "SR-UIUX",
            departmentName: "Product & UI/UX Design",
            description: "Interactive wireframes, user testing, and design system governance",
            status: "active",
            organizationId: "default-org",
        },

        // Quality Assurance (QA)
        {
            name: "QA Manager / Test Lead",
            code: "QA-LEAD",
            departmentName: "Quality Assurance (QA)",
            description: "Test strategy planning, release sign-offs, and QA team leadership",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Senior QA Automation Engineer",
            code: "SR-QA-AUTO",
            departmentName: "Quality Assurance (QA)",
            description: "Automated regression suites, Playwright/Cypress frameworks, and CI integration",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "QA Automation Engineer",
            code: "QA-ENG",
            departmentName: "Quality Assurance (QA)",
            description: "End-to-end automated testing and release verification",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Manual Software Tester",
            code: "QA-MAN",
            departmentName: "Quality Assurance (QA)",
            description: "Exploratory testing, bug reporting, and user scenario validation",
            status: "active",
            organizationId: "default-org",
        },

        // DevOps & Cloud SRE
        {
            name: "Head of Cloud & Infrastructure",
            code: "HEAD-INFRA",
            departmentName: "DevOps & Cloud SRE",
            description: "Multi-cloud strategy (AWS/GCP), security compliance, and SRE direction",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Lead DevOps Engineer",
            code: "LEAD-DEVOPS",
            departmentName: "DevOps & Cloud SRE",
            description: "Kubernetes orchestration, Terraform automation, and 99.99% uptime SRE",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "DevOps / SRE Engineer",
            code: "DEVOPS-ENG",
            departmentName: "DevOps & Cloud SRE",
            description: "Infrastructure as Code, Docker containers, AWS deployments, and monitoring",
            status: "active",
            organizationId: "default-org",
        },

        // HR & People Operations
        {
            name: "Head of HR & People Ops",
            code: "HEAD-HR",
            departmentName: "HR & People Operations",
            description: "People strategy, employee retention, talent development, and HR compliance",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Technical Recruiter & HR Lead",
            code: "HR-LEAD",
            departmentName: "HR & People Operations",
            description: "Developer recruitment, technical interviewing, and employee engagement",
            status: "active",
            organizationId: "default-org",
        },

        // Sales & Account Management
        {
            name: "VP of Sales & Growth",
            code: "VP-SALES",
            departmentName: "Sales & Account Management",
            description: "Global enterprise client expansion, revenue growth, and tech partnership strategies",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Software Solutions Consultant",
            code: "SOL-CONS",
            departmentName: "Sales & Account Management",
            description: "B2B client technical consultation, RFPs, and solution architecture",
            status: "active",
            organizationId: "default-org",
        },

        // Finance & Operations
        {
            name: "Chief Financial Officer (CFO)",
            code: "CFO",
            departmentName: "Finance & Operations",
            description: "Corporate financial management, investor relations, and capital allocation",
            status: "active",
            organizationId: "default-org",
        },
        {
            name: "Finance & Payroll Manager",
            code: "FIN-MGR",
            departmentName: "Finance & Operations",
            description: "Employee salary disbursements, financial accounting, and tax compliance",
            status: "active",
            organizationId: "default-org",
        },
    ];
    for (const item of designationsData) {
        const dept = await prisma.department.findFirst({ where: { name: item.departmentName } });
        const deptId = dept ? dept.id : null;
        await prisma.designation.upsert({
            where: { code: item.code },
            update: { name: item.name, description: item.description, status: item.status, departmentName: item.departmentName, departmentId: deptId },
            create: { ...item, departmentId: deptId },
        }).catch((err) => console.warn(`Note: Could not seed Designation ${item.code}:`, err.message));
    }
    console.log("✅ Designations linked to departments and seeded.");
    console.log("🎉 All Software Company Master Data successfully seeded!");
}
seedSoftwareCompanyMasterData()
    .catch((e) => {
    console.error("❌ Error seeding master data:", e);
})
    .finally(async () => {
    await prisma.$disconnect();
});
