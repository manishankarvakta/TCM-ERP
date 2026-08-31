export function getTodayInTimezone(timeZone: string = "Asia/Dhaka"): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function getStartOfDayInTimezone(dateStr: string, timeZone: string = "Asia/Dhaka"): Date {
  // dateStr is YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  // Create a UTC date as reference, then adjust for timezone offset
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  // Get offset at target time
  const tzFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Calculate local date parts in target timezone
  const parts = tzFormatter.formatToParts(utcDate);
  const partsMap: Record<string, string> = {};
  parts.forEach((p) => {
    partsMap[p.type] = p.value;
  });

  const tzYear = Number(partsMap.year);
  const tzMonth = Number(partsMap.month);
  const tzDay = Number(partsMap.day);
  let tzHour = Number(partsMap.hour);
  if (tzHour === 24) tzHour = 0;

  // Offset in hours between UTC and target TZ at this time
  const targetTzAsUtc = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, Number(partsMap.minute), Number(partsMap.second)));
  const diffMs = targetTzAsUtc.getTime() - utcDate.getTime();

  // Return Date representing 00:00:00 local time in target timezone
  return new Date(utcDate.getTime() - diffMs);
}

export function getEndOfDayInTimezone(dateStr: string, timeZone: string = "Asia/Dhaka"): Date {
  const startOfDay = getStartOfDayInTimezone(dateStr, timeZone);
  return new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000) - 1);
}

// Test with simulated UTC time 2026-08-27 21:32:42 (which is 2026-08-28 03:32:42 in Asia/Dhaka)
const sampleDate = new Date("2026-08-27T21:32:42.528Z");
const formatterBD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
console.log('Sample UTC Date:', sampleDate.toISOString());
console.log('In Asia/Dhaka:', formatterBD.format(sampleDate));
console.log('Current Today in Asia/Dhaka:', getTodayInTimezone("Asia/Dhaka"));

const startAug28 = getStartOfDayInTimezone("2026-08-28", "Asia/Dhaka");
const endAug28 = getEndOfDayInTimezone("2026-08-28", "Asia/Dhaka");
console.log('2026-08-28 Start of Day (UTC):', startAug28.toISOString());
console.log('2026-08-28 End of Day (UTC):  ', endAug28.toISOString());
