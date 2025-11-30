'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuotationItem, Component } from '@/types/quotation';
import { ComponentForm } from './ComponentForm';
import { calculateItemAmount } from '@/lib/utils/calculations';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

interface ItemFormProps {
  items: QuotationItem[];
  setItems: (items: QuotationItem[]) => void;
}

export function ItemForm({ items, setItems }: ItemFormProps) {
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const addItem = () => {
    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
      quotationId: '',
      slNo: items.length + 1,
      name: '',
      description: '',
      components: [],
      amount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setItems([...items, newItem]);
    setExpandedItem(items.length);
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'components') {
      updated[index].amount = calculateItemAmount(updated[index]);
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    updated.forEach((item, i) => {
      item.slNo = i + 1;
    });
    setItems(updated);
  };

  const addComponent = (itemIndex: number, component: Component) => {
    const updated = [...items];
    updated[itemIndex].components.push(component);
    updated[itemIndex].amount = calculateItemAmount(updated[itemIndex]);
    setItems(updated);
  };

  const updateComponent = (itemIndex: number, componentIndex: number, component: Component) => {
    const updated = [...items];
    updated[itemIndex].components[componentIndex] = component;
    updated[itemIndex].amount = calculateItemAmount(updated[itemIndex]);
    setItems(updated);
  };

  const removeComponent = (itemIndex: number, componentIndex: number) => {
    const updated = [...items];
    updated[itemIndex].components.splice(componentIndex, 1);
    updated[itemIndex].amount = calculateItemAmount(updated[itemIndex]);
    setItems(updated);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Items & Components</CardTitle>
          <Button type="button" onClick={addItem} size="sm">
            <FiPlus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, itemIndex) => (
          <Card key={item.id} className="border-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Item {item.slNo}</CardTitle>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeItem(itemIndex)}
                >
                  <FiTrash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item Name</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(itemIndex, 'name', e.target.value)}
                    placeholder="e.g., Master Bed Closet"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(itemIndex, 'description', e.target.value)}
                    placeholder="Item description"
                  />
                </div>
              </div>

              <ComponentForm
                components={item.components}
                onAdd={(component) => addComponent(itemIndex, component)}
                onUpdate={(componentIndex, component) =>
                  updateComponent(itemIndex, componentIndex, component)
                }
                onRemove={(componentIndex) => removeComponent(itemIndex, componentIndex)}
              />

              <div className="flex justify-end">
                <div className="text-lg font-semibold">
                  Item Total: ₹{item.amount.toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items added yet. Click "Add Item" to get started.
          </div>
        )}

        {items.length > 0 && (
          <div className="flex justify-end pt-4 border-t">
            <div className="text-2xl font-bold">
              Grand Total: ₹{items.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

