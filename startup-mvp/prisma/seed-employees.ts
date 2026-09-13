import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedEmployees() {
  console.log("🌱 Seeding Departments, Shifts, and Employees...");

  // 1. Fetch user & organization ID
  let firstUser = await prisma.user.findFirst();
  const userId = firstUser?.id || "system";
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Default Organization",
        createdBy: userId,
      },
    });
  }
  const organizationId = org.id;

  // 2. Seed Departments
  const deptData = [
    { name: "HR & People Operations", code: "HR" },
    { name: "Finance & Accounts", code: "FIN" },
    { name: "Engineering & IT", code: "ENG" },
    { name: "Sales & Marketing", code: "MKT" },
    { name: "Operations & Logistics", code: "OPS" },
  ];

  const deptMap: Record<string, string> = {};

  for (const d of deptData) {
    let dept = await prisma.department.findFirst({
      where: { code: d.code, organizationId },
    });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          name: d.name,
          code: d.code,
          status: "active",
          organizationId: organizationId,
        },
      });
    }
    deptMap[d.name] = dept.id;
  }

  // 3. Seed Shifts
  const shiftData = [
    { name: "Morning Shift (General)", startTime: "09:00", endTime: "18:00", graceMinutes: 15, lateAfter: 30, halfDayAfter: 120, otStartAfter: 30 },
    { name: "Evening Shift", startTime: "14:00", endTime: "22:00", graceMinutes: 15, lateAfter: 30, halfDayAfter: 120, otStartAfter: 30 },
    { name: "Night Shift", startTime: "22:00", endTime: "06:00", graceMinutes: 15, lateAfter: 30, halfDayAfter: 120, otStartAfter: 30 },
  ];

  const shiftMap: Record<string, string> = {};

  for (const s of shiftData) {
    let shift = await prisma.shift.findFirst({
      where: { name: s.name },
    });
    if (!shift) {
      shift = await prisma.shift.create({
        data: {
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          graceMinutes: s.graceMinutes,
          lateAfter: s.lateAfter,
          halfDayAfter: s.halfDayAfter,
          otStartAfter: s.otStartAfter,
          status: "active",
          createdBy: userId,
        },
      });
    }
    shiftMap[s.name] = shift.id;
  }

  // 4. Sample Employees Data
  const sampleEmployees = [
    {
      name: "Tanvir Ahmed",
      employeeCode: "EMP-101",
      email: "tanvir.ahmed@example.com",
      phone: "+8801711000001",
      department: "Engineering & IT",
      designation: "Senior Software Engineer",
      gender: "Male",
      salary: 85000,
      shiftName: "Morning Shift (General)",
      deviceUserId: "1001",
    },
    {
      name: "Nusrat Jahan",
      employeeCode: "EMP-102",
      email: "nusrat.jahan@example.com",
      phone: "+8801711000002",
      department: "HR & People Operations",
      designation: "HR Manager",
      gender: "Female",
      salary: 75000,
      shiftName: "Morning Shift (General)",
      deviceUserId: "1002",
    },
    {
      name: "Rahim Chowdhury",
      employeeCode: "EMP-103",
      email: "rahim.chowdhury@example.com",
      phone: "+8801711000003",
      department: "Finance & Accounts",
      designation: "Senior Accountant",
      gender: "Male",
      salary: 68000,
      shiftName: "Morning Shift (General)",
      deviceUserId: "1003",
    },
    {
      name: "Sadia Rahman",
      employeeCode: "EMP-104",
      email: "sadia.rahman@example.com",
      phone: "+8801711000004",
      department: "Sales & Marketing",
      designation: "Sales Executive",
      gender: "Female",
      salary: 55000,
      shiftName: "Evening Shift",
      deviceUserId: "1004",
    },
    {
      name: "Kazi Imran",
      employeeCode: "EMP-105",
      email: "kazi.imran@example.com",
      phone: "+8801711000005",
      department: "Operations & Logistics",
      designation: "Operations Supervisor",
      gender: "Male",
      salary: 60000,
      shiftName: "Night Shift",
      deviceUserId: "1005",
    },
    {
      name: "Mehedi Hasan",
      employeeCode: "EMP-106",
      email: "mehedi.hasan@example.com",
      phone: "+8801711000006",
      department: "Engineering & IT",
      designation: "DevOps Engineer",
      gender: "Male",
      salary: 80000,
      shiftName: "Morning Shift (General)",
      deviceUserId: "1006",
    },
    {
      name: "Farhana Islam",
      employeeCode: "EMP-107",
      email: "farhana.islam@example.com",
      phone: "+8801711000007",
      department: "HR & People Operations",
      designation: "Recruitment Specialist",
      gender: "Female",
      salary: 50000,
      shiftName: "Morning Shift (General)",
      deviceUserId: "1007",
    },
    {
      name: "Mahfuzur Rahman",
      employeeCode: "EMP-108",
      email: "mahfuz.rahman@example.com",
      phone: "+8801711000008",
      department: "Operations & Logistics",
      designation: "Logistics Coordinator",
      gender: "Male",
      salary: 52000,
      shiftName: "Evening Shift",
      deviceUserId: "1008",
    },
  ];

  let createdCount = 0;

  for (const emp of sampleEmployees) {
    const existing = await prisma.employee.findFirst({
      where: {
        OR: [{ employeeCode: emp.employeeCode }, { deviceUserId: emp.deviceUserId }],
      },
    });

    if (!existing) {
      const deptId = deptMap[emp.department];
      const sId = shiftMap[emp.shiftName];
      await prisma.employee.create({
        data: {
          name: emp.name,
          employeeCode: emp.employeeCode,
          email: emp.email,
          phone: emp.phone,
          department: emp.department,
          Organization: { connect: { id: organizationId } },
          ...(deptId ? { DepartmentRef: { connect: { id: deptId } } } : {}),
          designation: emp.designation,
          gender: emp.gender,
          salary: emp.salary,
          status: "active",
          ...(sId ? { shift: { connect: { id: sId } } } : {}),
          deviceUserId: emp.deviceUserId,
          joiningDate: new Date(),
        },
      });
      createdCount++;
    }
  }

  console.log(`✅ SUCCESS: ${createdCount} employees created successfully!`);
}

seedEmployees()
  .catch((e) => {
    console.error("❌ Error seeding employees:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
