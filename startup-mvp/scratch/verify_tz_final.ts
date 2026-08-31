import { getTodayInTimezone, getStartOfDayInTimezone, getEndOfDayInTimezone } from '../lib/timezone-utils';

console.log('Testing lib/timezone-utils.ts:');
console.log('Today in Asia/Dhaka:', getTodayInTimezone('Asia/Dhaka'));
console.log('2026-08-28 Start of Day (Asia/Dhaka):', getStartOfDayInTimezone('2026-08-28', 'Asia/Dhaka').toISOString());
console.log('2026-08-28 End of Day (Asia/Dhaka):  ', getEndOfDayInTimezone('2026-08-28', 'Asia/Dhaka').toISOString());
