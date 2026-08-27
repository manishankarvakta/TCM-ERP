import { DEFAULT_PREFERENCES } from "@/lib/preferences-data";

/**
 * Get current date string (YYYY-MM-DD) in the specified or default application timezone.
 */
export function getTodayInTimezone(timeZone: string = DEFAULT_PREFERENCES.timezone): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || DEFAULT_PREFERENCES.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch (err) {
    console.error("Error formatting today in timezone:", err);
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Format a Date or date string to YYYY-MM-DD in the target timezone.
 */
export function formatDateToYYYYMMDDInTimezone(
  date: Date | string,
  timeZone: string = DEFAULT_PREFERENCES.timezone
): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || DEFAULT_PREFERENCES.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d);
  } catch (err) {
    console.error("Error formatting date in timezone:", err);
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
  }
}

/**
 * Get UTC Date object for start of day (00:00:00.000) for a YYYY-MM-DD date in target timezone.
 */
export function getStartOfDayInTimezone(
  dateStr: string,
  timeZone: string = DEFAULT_PREFERENCES.timezone
): Date {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const tzFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || DEFAULT_PREFERENCES.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

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

    const targetTzAsUtc = new Date(
      Date.UTC(
        tzYear,
        tzMonth - 1,
        tzDay,
        tzHour,
        Number(partsMap.minute || 0),
        Number(partsMap.second || 0)
      )
    );
    const diffMs = targetTzAsUtc.getTime() - utcDate.getTime();

    return new Date(utcDate.getTime() - diffMs);
  } catch (err) {
    console.error("Error calculating start of day in timezone:", err);
    return new Date(dateStr);
  }
}

/**
 * Get UTC Date object for end of day (23:59:59.999) for a YYYY-MM-DD date in target timezone.
 */
export function getEndOfDayInTimezone(
  dateStr: string,
  timeZone: string = DEFAULT_PREFERENCES.timezone
): Date {
  const startOfDay = getStartOfDayInTimezone(dateStr, timeZone);
  return new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
}
