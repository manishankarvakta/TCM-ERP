'use client';

import { formatCurrency } from '@/lib/utils/formatters';
import { LOCATION_DISPLAY_NAMES } from '@/types/constants/locations';
import type { LocationRates } from '@/types/pwd-schedule';
import type { LocationType } from '@/types/enums';

interface LocationRatesTableProps {
  rates: LocationRates;
  selectedLocation?: LocationType;
}

export function LocationRatesTable({
  rates,
  selectedLocation,
}: LocationRatesTableProps) {
  const locations: LocationType[] = [
    'DHAKA_MYMENSINGH',
    'CHATTOGRAM_SYLHET',
    'KHULNA_BARISAL_GOPALGONJ',
    'RAJSHAHI_RANGPUR',
  ];

  return (
    <div className="min-w-[300px]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Location</th>
            <th className="text-right p-2">Rate</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => {
            // Map location enum to LocationRates key
            const rateKeyMap: Record<LocationType, keyof LocationRates> = {
              DHAKA_MYMENSINGH: 'dhaka_mymensingh',
              CHATTOGRAM_SYLHET: 'chattogram_sylhet',
              KHULNA_BARISAL_GOPALGONJ: 'khulna_barisal_gopalgonj',
              RAJSHAHI_RANGPUR: 'rajshahi_rangpur',
            };
            const rateKey = rateKeyMap[location] as keyof LocationRates;
            const rate = rates[rateKey] || 0;
            const isSelected = selectedLocation === location;
            
            return (
              <tr
                key={location}
                className={`border-b ${isSelected ? 'bg-primary/10 font-semibold' : ''}`}
              >
                <td className="p-2">{LOCATION_DISPLAY_NAMES[location]}</td>
                <td className="p-2 text-right">
                  {formatCurrency(rate)}
                  {isSelected && ' ✓'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

