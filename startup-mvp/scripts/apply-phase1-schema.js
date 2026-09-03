const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Update Organization model with Departments and Teams relations
const orgTarget = '  ChartOfAccount   ChartOfAccount[]';
const orgReplacement = `  ChartOfAccount   ChartOfAccount[]
  Departments      Department[]
  Teams            Team[]`;

if (schema.includes(orgTarget) && !schema.includes('Departments      Department[]')) {
  schema = schema.replace(orgTarget, orgReplacement);
}

// 2. Add Department and Team models before PasswordReset
const departmentAndTeamModels = `
model Department {
  id                String        @id @default(cuid())
  organizationId    String
  name              String
  code              String
  description       String?
  managerEmployeeId String?
  status            String        @default("active")
  sortOrder         Int           @default(0)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  Organization      Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  Manager           Employee?     @relation("DepartmentManager", fields: [managerEmployeeId], references: [id], onDelete: SetNull)
  Teams             Team[]
  Employees         Employee[]    @relation("EmployeeDepartment")

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([organizationId, status])
  @@index([managerEmployeeId])
}

model Team {
  id             String        @id @default(cuid())
  organizationId String
  departmentId   String
  name           String
  code           String
  description    String?
  leadEmployeeId String?
  status         String        @default("active")
  sortOrder      Int           @default(0)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  Organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  Department     Department    @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  Lead           Employee?     @relation("TeamLead", fields: [leadEmployeeId], references: [id], onDelete: SetNull)
  Employees      Employee[]    @relation("EmployeeTeam")

  @@unique([organizationId, departmentId, code])
  @@index([organizationId])
  @@index([departmentId])
  @@index([organizationId, departmentId])
  @@index([leadEmployeeId])
}
`;

if (!schema.includes('model Department {')) {
  schema = schema.replace('model PasswordReset {', `${departmentAndTeamModels}\nmodel PasswordReset {`);
}

// 3. Update Employee model with departmentId, teamId, reportingManagerId and relation fields
const empTarget = '  organizationId         String';
const empReplacement = `  departmentId           String?
  teamId                 String?
  reportingManagerId     String?
  DepartmentRef          Department?        @relation("EmployeeDepartment", fields: [departmentId], references: [id], onDelete: SetNull)
  TeamRef                Team?              @relation("EmployeeTeam", fields: [teamId], references: [id], onDelete: SetNull)
  ReportingManager       Employee?          @relation("EmployeeReportingManager", fields: [reportingManagerId], references: [id], onDelete: SetNull)
  Subordinates           Employee[]         @relation("EmployeeReportingManager")
  ManagedDepartments     Department[]       @relation("DepartmentManager")
  LedTeams               Team[]             @relation("TeamLead")
  organizationId         String`;

if (schema.includes(empTarget) && !schema.includes('DepartmentRef          Department?')) {
  schema = schema.replace(empTarget, empReplacement);
}

// Add indexes to Employee model
const empIndexTarget = '  @@index([organizationId])';
const empIndexReplacement = `  @@index([organizationId])
  @@index([departmentId])
  @@index([teamId])
  @@index([reportingManagerId])
  @@index([organizationId, departmentId])
  @@index([organizationId, teamId])`;

if (schema.includes(empIndexTarget) && !schema.includes('@@index([departmentId])')) {
  schema = schema.replace(empIndexTarget, empIndexReplacement);
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Successfully updated schema.prisma with Department, Team, and Employee organizational relations.');
