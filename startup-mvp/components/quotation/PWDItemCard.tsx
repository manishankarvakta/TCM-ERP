'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils/formatters';
import { LocationRatesTable } from './LocationRatesTable';
import { FiInfo, FiTrash2 } from 'react-icons/fi';
import type { PWDItemFormData } from '@/types/quotation';
import type { LocationType } from '@/types/enums';
import type { LocationRates } from '@/types/pwd-schedule';

interface PWDItemCardProps {
  item: PWDItemFormData;
  selectedLocation?: LocationType;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function PWDItemCard({
  item,
  selectedLocation,
  onQuantityChange,
  onRemove,
}: PWDItemCardProps) {
  const rates: LocationRates = {
    dhaka_mymensingh: item.rateDhakaMym || 0,
    chattogram_sylhet: item.rateChatSyl || 0,
    khulna_barisal_gopalgonj: item.rateKhulBariGop || 0,
    rajshahi_rangpur: item.rateRajRange || 0,
  };

  const selectedRate = item.selectedRate || item.rateDhakaMym || 0;
  const selectedRateNumber = typeof selectedRate === 'string' ? parseFloat(selectedRate) || 0 : selectedRate;
  const amount = (selectedRateNumber * item.quantity) || 0;

  return (
    <Card className="border-2">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{item.itemNumber}</Badge>
              <span className="text-sm text-gray-500">{item.unit}</span>
            </div>
            <p className="text-sm font-medium mb-1">{item.description}</p>
            {item.specifications && (
              <p className="text-xs text-gray-600">{item.specifications}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
          >
            <FiTrash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Rate (per {item.unit})</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                 {formatCurrency(selectedRateNumber)}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <FiInfo className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="p-0">
                    <LocationRatesTable
                      rates={rates}
                      selectedLocation={selectedLocation}
                    />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div>
            <Label htmlFor={`qty-${item.id}`} className="text-xs">
              Quantity
            </Label>
            <Input
              id={`qty-${item.id}`}
              type="number"
              step="0.01"
              min="0"
              value={item.quantity}
              onChange={(e) => onQuantityChange(Number(e.target.value))}
              className="h-9"
            />
          </div>

          <div>
            <Label className="text-xs">Amount</Label>
            <div className="text-sm font-bold text-primary">
              {formatCurrency(amount)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

