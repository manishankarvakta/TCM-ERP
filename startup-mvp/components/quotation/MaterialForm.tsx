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
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import type { MaterialItemFormData } from '@/types/quotation';
import { MATERIAL_CATEGORIES, QUANTITY_UNITS } from '@/types/enums';
import { MaterialLibraryModal } from './MaterialLibraryModal';

interface MaterialFormProps {
  materials: MaterialItemFormData[];
  onAdd: (material: MaterialItemFormData) => void;
  onUpdate: (index: number, material: MaterialItemFormData) => void;
  onRemove: (index: number) => void;
}

export function MaterialForm({
  materials,
  onAdd,
  onUpdate,
  onRemove,
}: MaterialFormProps) {
  const [materialModalOpen, setMaterialModalOpen] = useState(false);

  const createNewMaterial = (): MaterialItemFormData => ({
    id: `material-${Date.now()}`,
    slNo: materials.length + 1,
    code: '',
    description: '',
    specifications: '',
    category: 'OTHER',
    unitPrice: 0,
    quantity: 0,
    quantityUnit: 'PC',
    amount: 0,
  });

  const handleAdd = () => {
    const newMaterial = createNewMaterial();
    onAdd(newMaterial);
  };

  const handleSelectFromLibrary = (libraryItem: any) => {
    const newMaterial: MaterialItemFormData = {
      id: `material-${Date.now()}`,
      materialId: libraryItem.id,
      slNo: materials.length + 1,
      code: libraryItem.code,
      description: libraryItem.description,
      specifications: libraryItem.specifications || '',
      category: libraryItem.category,
      unitPrice: Number(libraryItem.unitPrice),
      quantity: 1, // Default quantity
      quantityUnit: libraryItem.quantityUnit,
      amount: Number(libraryItem.unitPrice) * 1,
    };
    onAdd(newMaterial);
    setMaterialModalOpen(false);
  };

  const handleUpdate = (index: number, field: keyof MaterialItemFormData, value: any) => {
    const material = { ...materials[index], [field]: value };
    
    // Calculate amount when quantity or unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      material.amount = (material.unitPrice || 0) * (material.quantity || 0);
    }
    
    // Update slNo if needed
    if (field === 'slNo') {
      materials.forEach((m, i) => {
        if (i !== index) {
          onUpdate(i, { ...m, slNo: i + 1 });
        }
      });
    }
    
    onUpdate(index, material);
  };

  const calculateAmount = (material: MaterialItemFormData): number => {
    return (material.unitPrice || 0) * (material.quantity || 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Materials</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => setMaterialModalOpen(true)}
            size="sm"
            variant="outline"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            From Library
          </Button>
          <Button type="button" onClick={handleAdd} size="sm" variant="outline">
            <FiPlus className="w-4 h-4 mr-2" />
            Add Manual
          </Button>
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
          No materials added. Click "From Library" or "Add Manual" to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material, index) => {
            const amount = calculateAmount(material);

            return (
              <Card key={material.id || index} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">#{material.slNo}</Badge>
                        {material.code && (
                          <Badge variant="secondary">{material.code}</Badge>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {material.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">
                        {material.description || 'Untitled Material'}
                      </CardTitle>
                    </div>
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
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Code</Label>
                      <Input
                        value={material.code || ''}
                        onChange={(e) => handleUpdate(index, 'code', e.target.value)}
                        placeholder="Material code"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={material.category}
                        onValueChange={(value) => handleUpdate(index, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MATERIAL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Input
                      value={material.description || ''}
                      onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                      placeholder="Material description"
                    />
                  </div>

                  {material.specifications && (
                    <div>
                      <Label>Specifications</Label>
                      <Input
                        value={material.specifications || ''}
                        onChange={(e) => handleUpdate(index, 'specifications', e.target.value)}
                        placeholder="Specifications"
                      />
                    </div>
                  )}

                  {/* Pricing - Main editable fields */}
                  <div className="bg-primary/5 p-4 rounded-lg space-y-3 border border-primary/20">
                    <Label className="text-sm font-semibold">Pricing (BDT)</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={material.unitPrice || ''}
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
                          value={material.quantity || ''}
                          onChange={(e) => handleUpdate(index, 'quantity', Number(e.target.value))}
                          placeholder="0"
                          className="font-semibold"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Qty Unit</Label>
                        <Select
                          value={material.quantityUnit || 'PC'}
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Total */}
      {materials.length > 0 && (
        <div className="flex justify-end pt-4 border-t">
          <div className="text-right">
            <Label className="text-sm text-muted-foreground">Materials Total</Label>
            <div className="text-2xl font-bold">
              {formatCurrency(
                materials.reduce((sum, material) => sum + calculateAmount(material), 0)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Material Library Modal */}
      <MaterialLibraryModal
        open={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
        onSelect={handleSelectFromLibrary}
      />
    </div>
  );
}

