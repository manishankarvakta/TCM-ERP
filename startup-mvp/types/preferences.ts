/**
 * Preferences Settings Type Definitions
 * 
 * User/Global preferences for regional, currency, and time settings.
 */

/**
 * Preferences settings structure
 */
export interface PreferencesSettings {
  // Currency
  currency: string;        // e.g., "USD", "BDT", "EUR"
  currencySymbol: string;  // e.g., "$", "৳", "€"
  
  // Regional
  country: string;         // ISO country code, e.g., "BD", "US"
  language: string;        // Language code, e.g., "en", "bn"
  
  // Time & Date
  timezone: string;        // IANA timezone, e.g., "Asia/Dhaka"
  dateFormat: string;      // e.g., "DD/MM/YYYY", "MM/DD/YYYY"
  timeFormat: "12h" | "24h";
  
  // Number formatting
  decimalSeparator: "." | ",";
  thousandsSeparator: "," | "." | " " | "none";

  // Procurement
  createPurchaseWithoutGRN: boolean;
}

/**
 * Settings key for preferences
 */
export const PREFERENCES_KEY = "app.preferences";

/**
 * Currency option
 */
export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

/**
 * Timezone option
 */
export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

/**
 * Country option
 */
export interface CountryOption {
  code: string;
  name: string;
}
