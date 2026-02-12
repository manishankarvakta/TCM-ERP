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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/formatters';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { PWDScheduleModal } from '@/components/pwd-schedule/PWDScheduleModal';
import { PWDItemCard } from './PWDItemCard';
import { InteriorUnitForm } from './InteriorUnitForm';
import { MaterialForm } from './MaterialForm';
import type { SectionFormData, PWDItemFormData, LocationType } from '@/types/quotation';
import { SECTION_TYPES } from '@/types/enums';
import { getPWDRateForLocation } from '@/types/constants/locations';

interface SectionFormProps {
  section: SectionFormData;
  sectionIndex: number;
  selectedLocation?: LocationType;
  onUpdate: (section: SectionFormData) => void;
  onRemove: () => void;
}

export function SectionForm({
  section,
  sectionIndex,
  selectedLocation,
  onUpdate,
  onRemove,
}: SectionFormProps) {
  const [pwdModalOpen, setPwdModalOpen] = useState(false);

  const handleUpdate = (field: keyof SectionFormData, value: any) => {
    onUpdate({ ...section, [field]: value });
  };

  const handleAddPWDItem = (pwdItem: any) => {
    const newItem: PWDItemFormData = {
      id: `pwd-${Date.now()}`,
      pwdScheduleId: pwdItem.id,
      itemNumber: pwdItem.itemNumber,
      code: pwdItem.code || "PWD-ITEM", // Added fallback code
      description: pwdItem.description,
      unit: pwdItem.unit,
      rateDhakaMym: Number(pwdItem.rateDhakaMym) || 0,
      rateChatSyl: Number(pwdItem.rateChatSyl) || 0,
      rateKhulBariGop: Number(pwdItem.rateKhulBariGop) || 0,
      rateRajRange: Number(pwdItem.rateRajRange) || 0,
      selectedRate: selectedLocation
        ? getPWDRateForLocation(
            {
              rateDhakaMym: pwdItem.rateDhakaMym,
              rateChatSyl: pwdItem.rateChatSyl,
              rateKhulBariGop: pwdItem.rateKhulBariGop,
              rateRajRange: pwdItem.rateRajRange,
            },
            selectedLocation
          )
        : Number(pwdItem.rateDhakaMym) || 0,
      quantity: 1,
      amount: selectedLocation
        ? getPWDRateForLocation(
            {
              rateDhakaMym: pwdItem.rateDhakaMym,
              rateChatSyl: pwdItem.rateChatSyl,
              rateKhulBariGop: pwdItem.rateKhulBariGop,
              rateRajRange: pwdItem.rateRajRange,
            },
            selectedLocation
          ) * 1
        : (Number(pwdItem.rateDhakaMym) || 0) * 1,
    };
    handleUpdate('pwdItems', [...(section.pwdItems || []), newItem]);
    setPwdModalOpen(false);
  };

  const handleUpdatePWDItem = (index: number, item: PWDItemFormData) => {
    const updated = [...(section.pwdItems || [])];
    updated[index] = item;
    handleUpdate('pwdItems', updated);
  };

  const handleRemovePWDItem = (index: number) => {
    const updated = (section.pwdItems || []).filter((_, i) => i !== index);
    handleUpdate('pwdItems', updated);
  };

  const handleUpdatePWDQuantity = (index: number, quantity: number) => {
    const item = (section.pwdItems || [])[index];
    if (!item) return;

    const updatedItem: PWDItemFormData = {
      ...item,
      quantity,
      amount: Number(item.selectedRate || 0) * quantity,
    };
    handleUpdatePWDItem(index, updatedItem);
  };

  const calculateSectionTotal = (): number => {
    let total = 0;
    
    // Sum PWD items
    (section.pwdItems || []).forEach((item) => {
      total += (item.amount || 0);
    });
    
    // Sum interior units
    (section.interiorUnits || []).forEach((unit) => {
      total += (unit.amount || 0);
    });
    
    // Sum materials
    (section.materials || []).forEach((material) => {
      total += (material.amount || 0);
    });
    
    return total;
  };

  const sectionTotal = calculateSectionTotal();

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Section {section.slNo}</Badge>
              <Input
                value={section.sectionName}
                onChange={(e) => handleUpdate('sectionName', e.target.value)}
                placeholder="Section name"
                className="flex-1 font-semibold"
              />
            </div>
            <Select
              value={section.sectionType}
              onValueChange={(value) => handleUpdate('sectionType', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
          >
            <FiTrash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tabs for different item types */}
        <Tabs defaultValue="pwd" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {(section.sectionType === 'CIVIL' || section.sectionType === 'GENERAL') && (
              <TabsTrigger value="pwd">PWD Items</TabsTrigger>
            )}
            {(section.sectionType === 'INTERIOR' || section.sectionType === 'GENERAL') && (
              <>
                <TabsTrigger value="units">Interior Units</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* PWD Items Tab */}
          {(section.sectionType === 'CIVIL' || section.sectionType === 'GENERAL') && (
            <TabsContent value="pwd" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setPwdModalOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <FiPlus className="w-4 h-4 mr-2" />
                  Add PWD Item
                </Button>
              </div>

              {(section.pwdItems || []).length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
                  No PWD items added. Click "Add PWD Item" to browse the schedule.
                </div>
              ) : (
                <div className="space-y-3">
                  {(section.pwdItems || []).map((item, index) => (
                    <PWDItemCard
                      key={item.id || index}
                      item={item}
                      selectedLocation={selectedLocation}
                      onQuantityChange={(qty) => handleUpdatePWDQuantity(index, qty)}
                      onRemove={() => handleRemovePWDItem(index)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* Interior Units Tab */}
          {(section.sectionType === 'INTERIOR' || section.sectionType === 'GENERAL') && (
            <TabsContent value="units" className="space-y-4">
              <InteriorUnitForm
                units={section.interiorUnits || []}
                onAdd={(unit) => handleUpdate('interiorUnits', [...(section.interiorUnits || []), unit])}
                onUpdate={(index, unit) => {
                  const updated = [...(section.interiorUnits || [])];
                  updated[index] = unit;
                  handleUpdate('interiorUnits', updated);
                }}
                onRemove={(index) => {
                  const updated = (section.interiorUnits || []).filter((_, i) => i !== index);
                  handleUpdate('interiorUnits', updated);
                }}
              />
            </TabsContent>
          )}

          {/* Materials Tab */}
          {(section.sectionType === 'INTERIOR' || section.sectionType === 'GENERAL') && (
            <TabsContent value="materials" className="space-y-4">
              <MaterialForm
                materials={section.materials || []}
                onAdd={(material) => handleUpdate('materials', [...(section.materials || []), material])}
                onUpdate={(index, material) => {
                  const updated = [...(section.materials || [])];
                  updated[index] = material;
                  handleUpdate('materials', updated);
                }}
                onRemove={(index) => {
                  const updated = (section.materials || []).filter((_, i) => i !== index);
                  handleUpdate('materials', updated);
                }}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Section Total */}
        <div className="flex justify-end pt-4 border-t">
          <div className="text-right">
            <Label className="text-sm text-muted-foreground">Section Total</Label>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(sectionTotal)}
            </div>
          </div>
        </div>
      </CardContent>

      {/* PWD Schedule Modal */}
      <PWDScheduleModal
        open={pwdModalOpen}
        onClose={() => setPwdModalOpen(false)}
        onSelect={handleAddPWDItem}
        selectedLocation={selectedLocation}
      />
    </Card>
  );
}

