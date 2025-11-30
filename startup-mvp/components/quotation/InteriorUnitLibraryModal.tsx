'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/formatters';
import { FiSearch, FiPlus } from 'react-icons/fi';

interface InteriorUnitTemplate {
  id: string;
  unitType: string;
  description: string;
  defaultHeight?: number;
  defaultWidth?: number;
  defaultDepth?: number;
  defaultUnitPrice: number;
  defaultQuantityUnit: string;
  finish?: string;
  material?: string;
  color?: string;
}

// Predefined unit templates
const UNIT_TEMPLATES: InteriorUnitTemplate[] = [
  {
    id: 'hanging-1',
    unitType: 'Hanging Section',
    description: 'Standard hanging section for clothes',
    defaultHeight: 2400,
    defaultWidth: 1800,
    defaultDepth: 600,
    defaultUnitPrice: 850.00,
    defaultQuantityUnit: 'sqft',
    finish: 'Laminated',
    material: 'Particle Board',
    color: 'White',
  },
  {
    id: 'shelf-1',
    unitType: 'Shelf Section',
    description: 'Open shelf section for storage',
    defaultHeight: 2400,
    defaultWidth: 1200,
    defaultDepth: 450,
    defaultUnitPrice: 750.00,
    defaultQuantityUnit: 'sqft',
    finish: 'Laminated',
    material: 'Particle Board',
    color: 'White',
  },
  {
    id: 'drawer-1',
    unitType: 'Drawer Section',
    description: 'Drawer section with multiple drawers',
    defaultHeight: 900,
    defaultWidth: 600,
    defaultDepth: 450,
    defaultUnitPrice: 1200.00,
    defaultQuantityUnit: 'PC',
    finish: 'Laminated',
    material: 'Particle Board',
    color: 'White',
  },
];

interface InteriorUnitLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: InteriorUnitTemplate) => void;
}

export function InteriorUnitLibraryModal({
  open,
  onClose,
  onSelect,
}: InteriorUnitLibraryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = useMemo(() => {
    if (!searchTerm) return UNIT_TEMPLATES;
    
    const searchLower = searchTerm.toLowerCase();
    return UNIT_TEMPLATES.filter(
      (template) =>
        template.unitType.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower)
    );
  }, [searchTerm]);

  const handleSelect = (template: InteriorUnitTemplate) => {
    onSelect(template);
    onClose();
    setSearchTerm('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Unit Template</DialogTitle>
          <DialogDescription>
            Choose a unit template to autofill dimensions and pricing. You can edit dimensions and quantity after selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by unit type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates List */}
          <ScrollArea className="h-[400px] pr-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium mb-2">No templates found</p>
                <p className="text-sm">Try adjusting your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="hover:border-primary cursor-pointer transition-colors"
                    onClick={() => handleSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.unitType}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-primary">
                            {formatCurrency(template.defaultUnitPrice)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            per {template.defaultQuantityUnit}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        {template.defaultHeight && (
                          <div>
                            H: {template.defaultHeight}mm
                          </div>
                        )}
                        {template.defaultWidth && (
                          <div>
                            W: {template.defaultWidth}mm
                          </div>
                        )}
                        {template.defaultDepth && (
                          <div>
                            D: {template.defaultDepth}mm
                          </div>
                        )}
                      </div>
                      {template.finish && (
                        <div className="mt-2 flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {template.finish}
                          </Badge>
                          {template.material && (
                            <Badge variant="outline" className="text-xs">
                              {template.material}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="text-sm text-muted-foreground">
            Showing {filteredTemplates.length} of {UNIT_TEMPLATES.length} templates
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

