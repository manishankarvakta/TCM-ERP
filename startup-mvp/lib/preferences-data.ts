/**
 * Preferences Data & Constants
 * 
 * Common options for currencies, timezones, countries, etc.
 */

import type { CurrencyOption, TimezoneOption, CountryOption } from "@/types/preferences";

/**
 * Common currencies
 */
export const CURRENCIES: CurrencyOption[] = [
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
];

/**
 * Common timezones grouped by region
 */
export const TIMEZONES: TimezoneOption[] = [
  // Asia
  { value: "Asia/Dhaka", label: "Dhaka (GMT+6)", offset: "+06:00" },
  { value: "Asia/Kolkata", label: "Kolkata (GMT+5:30)", offset: "+05:30" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)", offset: "+04:00" },
  { value: "Asia/Bangkok", label: "Bangkok (GMT+7)", offset: "+07:00" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)", offset: "+08:00" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)", offset: "+09:00" },
  { value: "Asia/Shanghai", label: "Shanghai (GMT+8)", offset: "+08:00" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (GMT+8)", offset: "+08:00" },
  
  // Europe
  { value: "Europe/London", label: "London (GMT+0)", offset: "+00:00" },
  { value: "Europe/Paris", label: "Paris (GMT+1)", offset: "+01:00" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1)", offset: "+01:00" },
  { value: "Europe/Moscow", label: "Moscow (GMT+3)", offset: "+03:00" },
  
  // Americas
  { value: "America/New_York", label: "New York (GMT-5)", offset: "-05:00" },
  { value: "America/Chicago", label: "Chicago (GMT-6)", offset: "-06:00" },
  { value: "America/Denver", label: "Denver (GMT-7)", offset: "-07:00" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8)", offset: "-08:00" },
  { value: "America/Toronto", label: "Toronto (GMT-5)", offset: "-05:00" },
  
  // Australia & Pacific
  { value: "Australia/Sydney", label: "Sydney (GMT+10)", offset: "+10:00" },
  { value: "Pacific/Auckland", label: "Auckland (GMT+12)", offset: "+12:00" },
];

/**
 * Common countries
 */
export const COUNTRIES: CountryOption[] = [
  { code: "BD", name: "Bangladesh" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "IN", name: "India" },
  { code: "PK", name: "Pakistan" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "CN", name: "China" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
];

/**
 * Date format options
 */
export const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2026)", example: "31/12/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2026)", example: "12/31/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-12-31)", example: "2026-12-31" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY (31-12-2026)", example: "31-12-2026" },
];

/**
 * Language options
 */
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "bn", name: "বাংলা (Bengali)" },
];

/**
 * Default preferences
 */
export const DEFAULT_PREFERENCES = {
  currency: "BDT",
  currencySymbol: "৳",
  country: "BD",
  language: "en",
  timezone: "Asia/Dhaka",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h" as const,
  decimalSeparator: "." as const,
  thousandsSeparator: "," as const,
  createPurchaseWithoutGRN: false,
};
