'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/formatters';
import { FiPlus, FiTrash2, FiInfo } from 'react-icons/fi';
import { InteriorUnitLibraryModal } from './InteriorUnitLibraryModal';
import type { InteriorUnitFormData } from '@/types/quotation';
import { DIMENSION_UNITS, QUANTITY_UNITS } from '@/types/enums';

interface InteriorUnitFormProps {
  units: InteriorUnitFormData[];
  onAdd: (unit: InteriorUnitFormData) => void;
  onUpdate: (index: number, unit: InteriorUnitFormData) => void;
  onRemove: (index: number) => void;
}

export function InteriorUnitForm({
  units,
  onAdd,
  onUpdate,
  onRemove,
}: InteriorUnitFormProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);

  const createNewUnit = (): InteriorUnitFormData => ({
    id: `unit-${Date.now()}`,
    unitType: '',
    boxCode: '',
    height: 0,
    width: 0,
    depth: 0,
    dimensionUnit: 'mm',
    finish: '',
    material: '',
    color: '',
    unitPrice: 0,
    quantity: 0,
    quantityUnit: 'PC',
    amount: 0,
  });

  const handleAdd = () => {
    const newUnit = createNewUnit();
    onAdd(newUnit);
    setExpandedIndex(units.length);
  };

  const handleSelectFromLibrary = (template: any) => {
    const newUnit: InteriorUnitFormData = {
      id: `unit-${Date.now()}`,
      unitType: template.unitType,
      boxCode: '',
      height: template.defaultHeight || 0,
      width: template.defaultWidth || 0,
      depth: template.defaultDepth || 0,
      dimensionUnit: 'mm',
      finish: template.finish || '',
      material: template.material || '',
      color: template.color || '',
      unitPrice: template.defaultUnitPrice,
      quantity: 1, // Default quantity - user will change this
      quantityUnit: template.defaultQuantityUnit,
      amount: template.defaultUnitPrice * 1,
    };
    onAdd(newUnit);
    setExpandedIndex(units.length);
    setLibraryModalOpen(false);
  };

  const handleUpdate = (index: number, field: keyof InteriorUnitFormData, value: any) => {
    const unit = { ...units[index], [field]: value };
    
    // Calculate amount when quantity or unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      unit.amount = (unit.unitPrice || 0) * (unit.quantity || 0);
    }
    
    onUpdate(index, unit);
  };

  const calculateAmount = (unit: InteriorUnitFormData): number => {
    return (unit.unitPrice || 0) * (unit.quantity || 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Interior Units</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => setLibraryModalOpen(true)}
            size="sm"
            variant="outline"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            From Template
          </Button>
          <Button type="button" onClick={handleAdd} size="sm" variant="outline">
            <FiPlus className="w-4 h-4 mr-2" />
            Add Manual
          </Button>
        </div>
      </div>

      {/* Unit Library Modal */}
      <InteriorUnitLibraryModal
        open={libraryModalOpen}
        onClose={() => setLibraryModalOpen(false)}
        onSelect={handleSelectFromLibrary}
      />

      {units.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
          No interior units added. Click "Add Unit" to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {units.map((unit, index) => {
            const amount = calculateAmount(unit);
            const isExpanded = expandedIndex === index;

            return (
              <Card key={unit.id || index} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Unit {index + 1}</Badge>
                        {unit.boxCode && (
                          <Badge variant="secondary">{unit.boxCode}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-base">
                        {unit.unitType || 'Untitled Unit'}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      >
                        <FiInfo className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Unit Type</Label>
                      <Input
                        value={unit.unitType || ''}
                        onChange={(e) => handleUpdate(index, 'unitType', e.target.value)}
                        placeholder="e.g., Hanging Section"
                      />
                    </div>
                    <div>
                      <Label>Box Code</Label>
                      <Input
                        value={unit.boxCode || ''}
                        onChange={(e) => handleUpdate(index, 'boxCode', e.target.value)}
                        placeholder="Optional box code"
                      />
                    </div>
                  </div>

                  {/* Dimensions - Main editable fields */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <Label className="text-sm font-semibold">Dimensions</Label>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Height</Label>
                        <Input
                          type="number"
                          value={unit.height || ''}
                          onChange={(e) => handleUpdate(index, 'height', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Width</Label>
                        <Input
                          type="number"
                          value={unit.width || ''}
                          onChange={(e) => handleUpdate(index, 'width', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Depth</Label>
                        <Input
                          type="number"
                          value={unit.depth || ''}
                          onChange={(e) => handleUpdate(index, 'depth', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit</Label>
                        <Select
                          value={unit.dimensionUnit || 'mm'}
                          onValueChange={(value) => handleUpdate(index, 'dimensionUnit', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIMENSION_UNITS.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Pricing - Quantity and Unit Price */}
                  <div className="bg-primary/5 p-4 rounded-lg space-y-3 border border-primary/20">
                    <Label className="text-sm font-semibold">Pricing</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Unit Price (BDT)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={unit.unitPrice || ''}
                          onChange={(e) => handleUpdate(index, 'unitPrice', Number(e.target.value))}
                          placeholder="0.00"
                          className="font-semibold"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={unit.quantity || ''}
                          onChange={(e) => handleUpdate(index, 'quantity', Number(e.target.value))}
                          placeholder="0"
                          className="font-semibold"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Qty Unit</Label>
                        <Select
                          value={unit.quantityUnit || 'PC'}
                          onValueChange={(value) => handleUpdate(index, 'quantityUnit', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUANTITY_UNITS.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t">
                      <div className="text-right">
                        <Label className="text-xs text-muted-foreground">Total Amount</Label>
                        <div className="text-xl font-bold text-primary">
                          {formatCurrency(amount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Specifications - Collapsible */}
                  {isExpanded && (
                    <div className="space-y-3 pt-3 border-t">
                      <Label className="text-sm font-semibold">Specifications</Label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Finish</Label>
                          <Input
                            value={unit.finish || ''}
                            onChange={(e) => handleUpdate(index, 'finish', e.target.value)}
                            placeholder="e.g., Laminated"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Material</Label>
                          <Input
                            value={unit.material || ''}
                            onChange={(e) => handleUpdate(index, 'material', e.target.value)}
                            placeholder="e.g., Particle Board"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <Input
                            value={unit.color || ''}
                            onChange={(e) => handleUpdate(index, 'color', e.target.value)}
                            placeholder="e.g., White"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Total */}
      {units.length > 0 && (
        <div className="flex justify-end pt-4 border-t">
          <div className="text-right">
            <Label className="text-sm text-muted-foreground">Units Total</Label>
            <div className="text-2xl font-bold">
              {formatCurrency(
                units.reduce((sum, unit) => sum + calculateAmount(unit), 0)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

