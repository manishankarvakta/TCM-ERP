import { prisma } from "../lib/prisma";

async function queryShift() {
  const shiftId = "cmr9c98ld000pqp01t4xxm00y";
  console.log(`🔍 Querying shift details for ID: ${shiftId}...`);
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId }
    });
    console.log("Shift Details:", JSON.stringify(shift, null, 2));
  } catch (error) {
    console.error("Error querying shift:", error);
  }
}

queryShift();
