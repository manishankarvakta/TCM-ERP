import { getTodayInTimezone, getStartOfDayInTimezone, getEndOfDayInTimezone } from '../lib/timezone-utils';

console.log('=== VERIFYING ALL TIMEZONE UTILS ===');
console.log('Current Date in Asia/Dhaka:', getTodayInTimezone('Asia/Dhaka'));
console.log('Start of Day (Asia/Dhaka):  ', getStartOfDayInTimezone(getTodayInTimezone('Asia/Dhaka'), 'Asia/Dhaka').toISOString());
console.log('End of Day (Asia/Dhaka):    ', getEndOfDayInTimezone(getTodayInTimezone('Asia/Dhaka'), 'Asia/Dhaka').toISOString());
