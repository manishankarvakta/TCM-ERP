'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Component } from '@/types/quotation';
import { calculateComponentAmount } from '@/lib/utils/calculations';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

interface ComponentFormProps {
  components: Component[];
  onAdd: (component: Component) => void;
  onUpdate: (index: number, component: Component) => void;
  onRemove: (index: number) => void;
}

export function ComponentForm({
  components,
  onAdd,
  onUpdate,
  onRemove,
}: ComponentFormProps) {
  const [expandedComponent, setExpandedComponent] = useState<number | null>(null);

  const createNewComponent = (): Component => ({
    id: `comp-${Date.now()}`,
    itemId: '',
    boxCode: '',
    description: '',
    height: 0,
    width: 0,
    depth: 0,
    unit: 'mm',
    unitPrice: 0,
    quantity: 0,
    quantityUnit: 'PC',
    amount: 0,
  });

  const handleAdd = () => {
    const newComponent = createNewComponent();
    onAdd(newComponent);
    setExpandedComponent(components.length);
  };

  const handleUpdate = (index: number, field: keyof Component, value: any) => {
    const component = { ...components[index], [field]: value };
    if (['unitPrice', 'quantity'].includes(field)) {
      component.amount = calculateComponentAmount(component);
    }
    onUpdate(index, component);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Components</Label>
        <Button type="button" onClick={handleAdd} size="sm" variant="outline">
          <FiPlus className="w-4 h-4 mr-2" />
          Add Component
        </Button>
      </div>

      {components.map((component, index) => (
        <div key={component.id} className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Component {index + 1}</h4>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onRemove(index)}
            >
              <FiTrash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Box Code</Label>
              <Input
                value={component.boxCode}
                onChange={(e) => handleUpdate(index, 'boxCode', e.target.value)}
                placeholder="Box code"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={component.description}
                onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                placeholder="Component description"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Height</Label>
              <Input
                type="number"
                value={component.height}
                onChange={(e) => handleUpdate(index, 'height', Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Width</Label>
              <Input
                type="number"
                value={component.width}
                onChange={(e) => handleUpdate(index, 'width', Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Depth</Label>
              <Input
                type="number"
                value={component.depth}
                onChange={(e) => handleUpdate(index, 'depth', Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Unit</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={component.unit}
                onChange={(e) => handleUpdate(index, 'unit', e.target.value)}
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Unit Price</Label>
              <Input
                type="number"
                step="0.01"
                value={component.unitPrice}
                onChange={(e) => handleUpdate(index, 'unitPrice', Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.01"
                value={component.quantity}
                onChange={(e) => handleUpdate(index, 'quantity', Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Quantity Unit</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={component.quantityUnit}
                onChange={(e) => handleUpdate(index, 'quantityUnit', e.target.value)}
              >
                <option value="PC">PC</option>
                <option value="Sft">Sft</option>
                <option value="Rft">Rft</option>
                <option value="Set">Set</option>
              </select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={component.amount.toFixed(2)}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Finish</Label>
              <Input
                value={component.finish || ''}
                onChange={(e) => handleUpdate(index, 'finish', e.target.value)}
                placeholder="Finish type"
              />
            </div>
            <div>
              <Label>Material</Label>
              <Input
                value={component.material || ''}
                onChange={(e) => handleUpdate(index, 'material', e.target.value)}
                placeholder="Material type"
              />
            </div>
            <div>
              <Label>Color</Label>
              <Input
                value={component.color || ''}
                onChange={(e) => handleUpdate(index, 'color', e.target.value)}
                placeholder="Color"
              />
            </div>
          </div>
        </div>
      ))}

      {components.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No components added. Click "Add Component" to add one.
        </div>
      )}
    </div>
  );
}

