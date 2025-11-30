import type { LocationType } from '../enums';

// Location display names mapping
export const LOCATION_DISPLAY_NAMES: Record<LocationType, string> = {
  DHAKA_MYMENSINGH: 'Dhaka & Mymensingh',
  CHATTOGRAM_SYLHET: 'Chattogram & Sylhet',
  KHULNA_BARISAL_GOPALGONJ: 'Khulna, Barisal & Gopalgonj',
  RAJSHAHI_RANGPUR: 'Rajshahi & Rangpur',
};

// LocationRates interface for PWD items
export interface LocationRates {
  rateDhakaMym?: number | string;
  rateChatSyl?: number | string;
  rateKhulBariGop?: number | string;
  rateRajRange?: number | string;
}

/**
 * Get PWD rate for a specific location from a rates object
 * @param rates - Object containing rates for different locations
 * @param location - The location type to get the rate for
 * @returns The rate for the specified location, or 0 if not found
 */
export function getPWDRateForLocation(
  rates: LocationRates,
  location?: LocationType
): number {
  if (!location) {
    return Number(rates.rateDhakaMym) || 0;
  }

  switch (location) {
    case 'DHAKA_MYMENSINGH':
      return Number(rates.rateDhakaMym) || 0;
    case 'CHATTOGRAM_SYLHET':
      return Number(rates.rateChatSyl) || 0;
    case 'KHULNA_BARISAL_GOPALGONJ':
      return Number(rates.rateKhulBariGop) || 0;
    case 'RAJSHAHI_RANGPUR':
      return Number(rates.rateRajRange) || 0;
    default:
      return Number(rates.rateDhakaMym) || 0;
  }
}

