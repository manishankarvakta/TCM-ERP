"use server";

import { getPayrollAttendanceWarnings } from "@/lib/hr/payroll/attendance-warnings";

export async function getPayrollWarningsAction(month: number, year: number) {
  try {
    // Generate start and end dates for the month
    const fromDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const toDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const result = await getPayrollAttendanceWarnings({ fromDate, toDate });
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error fetching payroll warnings:", error);
    return { success: false, error: "Failed to fetch payroll warnings" };
  }
}
