# HRM Regression Testing

This document details the automated regression testing pipeline for the ffERP HRM & Payroll modules. 
To ensure zero-regression deployments, the CI/CD pipeline runs these tests automatically against an isolated database.

## Running Tests Locally

You can run the full suite or individual test scripts using NPM:

```bash
# Run the entire HRM Regression Suite sequentially
npm run test:hrm

# Run specific isolated test scripts
npm run test:hrm:leave            # Validates Leave Cancellation Rollback
npm run test:hrm:payroll-settings # Validates Payroll & Accounting Guards
npm run test:hrm:attendance       # Validates Bulk Attendance & Weekends
npm run test:hrm:overnight        # Validates Overnight Shifts & Cross-day logic
npm run test:hrm:payroll-export   # Validates CSV Export & Payslip Serialization
npm run test:hrm:biometric        # Validates MB360 Queue & Acknowledgement
```

## How It Works

1. **Test Runner (`scripts/hr/run-hrm-regression-suite.ts`)**:
   Acts as the orchestrator. It ensures basic test fixtures (User, LeaveType, Shift, Employee) exist in the local database. It then sequentially executes all scripts using `tsx`. If any script fails, the runner exits with `1`, ensuring the CI pipeline fails.
   
2. **Fixture Stabilization**:
   Each validation script contains explicit `try/finally` blocks. This ensures that any mock data generated during a test (such as `AttendanceLog`, `Payroll`, `BiometricCommand`) is cleanly deleted from the database regardless of whether the test passed or threw an exception.

3. **Continuous Integration (CI)**:
   The GitHub Actions workflow (`.github/workflows/hrm-regression.yml`) spins up an isolated `postgres:15` service container. It runs `npx prisma db push` to generate an empty database schema and executes `npm run test:hrm`. 
   **Note**: Because of the isolated CI database, you do not have to worry about test data leaking into production.

## Adding New Tests

When a new critical bug is fixed in the HRM module, you should create a new test script:

1. Create a file like `scripts/hr/validate-new-feature.ts`.
2. Mock data using `prisma.entity.create` inside a `try { ... }` block.
3. Call the actual Next.js Server Action or utility function.
4. Verify the database state using `if (check !== expected) throw new Error(...)`.
5. Clean up your mock data inside the `} finally { ... }` block.
6. Add the script path to the `SCRIPTS` array in `scripts/hr/run-hrm-regression-suite.ts`.
7. Add a convenience script command in `package.json`.
