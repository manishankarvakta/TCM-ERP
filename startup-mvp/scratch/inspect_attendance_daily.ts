import { prisma } from "../lib/prisma";

async function main() {
  const employeeId = "cmtbi3h730037ph01xeaj32cc";
  const startDate = new Date(2026, 8, 1);
  const endDate = new Date(2026, 8, 30, 23, 59, 59, 999);

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: { gte: startDate, lte: endDate }
    },
    orderBy: { date: "asc" }
  });

  console.log("Date       | Status   | CheckIn | CheckOut| LateMins | LateCountVal | WorkHours | Notes");
  console.log("-----------------------------------------------------------------------------------------");
  for (const a of attendances) {
    const d = a.date.toISOString().split("T")[0];
    const ci = a.checkIn ? a.checkIn.toISOString().split("T")[1].slice(0, 5) : "None ";
    const co = a.checkOut ? a.checkOut.toISOString().split("T")[1].slice(0, 5) : "None ";
    console.log(`${d} | ${a.status.padEnd(8)} | ${ci}   | ${co}   | ${String(a.lateMinutes).padStart(4)} mins | ${String(a.lateCountValue).padStart(6)}       | ${String(a.workHours).padStart(5)} hrs | ${a.notes || ""}`);
  }

  console.log("\n================ AGGREGATES ================");
  const statusCounts: Record<string, number> = {};
  let totalLateCountValue = 0;
  let totalBreakLateCountValue = 0;
  let totalAbsentCalcDays = 0;

  for (const a of attendances) {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    totalLateCountValue += Number(a.lateCountValue || 0);
    totalBreakLateCountValue += Number(a.breakLateCountValue || 0);

    if (a.status === "ABSENT") {
      totalAbsentCalcDays += 1;
    } else if (a.status === "HALF_DAY") {
      totalAbsentCalcDays += 0.5;
    }
  }

  console.log("Status Counts (as displayed by simple filter):", statusCounts);
  console.log("Total LateCountValue sum across month:", totalLateCountValue);
  console.log("Total BreakLateCountValue sum across month:", totalBreakLateCountValue);
  console.log("Effective Absent Days used in payroll formula (ABSENT + 0.5*HALF_DAY):", totalAbsentCalcDays);
}

main().catch(console.error).finally(() => process.exit(0));
