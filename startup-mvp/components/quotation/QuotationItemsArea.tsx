'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/formatters';
import { FiPlus, FiTrash2, FiEdit2, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { BsGripVertical } from 'react-icons/bs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface QuotationItem {
  id: string;
  sl: number;
  code?: string;
  description?: string;
  height?: number;
  width?: number;
  depth?: number;
  unitPrice: number;
  quantity: number;
  amount: number;
  note?: string;
  itemId?: string; // Reference to catalog item
}

interface CatalogItem {
  id: string;
  code: string;
  description: string;
  unitPrice: number;
  category: string | null;
}

interface ItemGroup {
  id: string;
  code?: string;
  description: string;
  quantity?: number;
  sortOrder: number;
  items: QuotationItem[];
  isExpanded?: boolean;
}

interface Module {
  id?: string;
  title: string;
  note?: string;
  discount?: number;
  sortOrder: number;
  items: QuotationItem[];
  groups: ItemGroup[];
}

interface QuotationItemsAreaProps {
  modules: Module[];
  onModulesChange: (modules: Module[]) => void;
}

// Sortable Item Component
function SortableItem({
  item,
  moduleIndex,
  itemIndex,
  groupIndex,
  onUpdate,
  onRemove,
  catalogItems,
}: {
  item: QuotationItem;
  moduleIndex: number;
  itemIndex: number;
  groupIndex?: number;
  onUpdate: (updates: Partial<QuotationItem>) => void;
  onRemove: () => void;
  catalogItems: CatalogItem[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleItemSelect = (itemId: string) => {
    if (itemId === 'manual') {
      onUpdate({ itemId: undefined });
      return;
    }

    const selectedItem = catalogItems.find((i) => i.id === itemId);
    if (selectedItem) {
      onUpdate({
        itemId: selectedItem.id,
        code: selectedItem.code,
        description: selectedItem.description,
        unitPrice: Number(selectedItem.unitPrice),
      });
    }
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'bg-muted' : ''}
    >
      <TableCell className="w-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <BsGripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium w-12">{item.sl}</TableCell>
      <TableCell>
        <Select
          value={item.itemId || 'manual'}
          onValueChange={handleItemSelect}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="Select item" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            <SelectItem value="manual">Manual Entry</SelectItem>
            {catalogItems.map((catalogItem) => (
              <SelectItem key={catalogItem.id} value={catalogItem.id}>
                {catalogItem.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={item.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Description"
          className="h-8 text-xs"
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Input
            type="number"
            value={item.height || ''}
            onChange={(e) => onUpdate({ height: Number(e.target.value) })}
            placeholder="H"
            className="h-8 w-16 text-xs"
          />
          <Input
            type="number"
            value={item.width || ''}
            onChange={(e) => onUpdate({ width: Number(e.target.value) })}
            placeholder="W"
            className="h-8 w-16 text-xs"
          />
          <Input
            type="number"
            value={item.depth || ''}
            onChange={(e) => onUpdate({ depth: Number(e.target.value) })}
            placeholder="D"
            className="h-8 w-16 text-xs"
          />
        </div>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onUpdate({ quantity: Number(e.target.value) })}
          className="h-8 w-20 text-xs"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={item.unitPrice}
          onChange={(e) => onUpdate({ unitPrice: Number(e.target.value) })}
          className="h-8 w-28 text-xs"
        />
      </TableCell>
      <TableCell className="text-right font-semibold w-32">
        {formatCurrency(item.amount)}
      </TableCell>
      <TableCell className="w-12">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0"
        >
          <FiTrash2 className="w-4 h-4 text-red-500" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function QuotationItemsArea({
  modules,
  onModulesChange,
}: QuotationItemsAreaProps) {
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch catalog items from database
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('/api/items');
        const data = await response.json();
        if (response.ok && !data.error) {
          setCatalogItems(data);
        } else {
          console.error('Error fetching items:', data.error || data.details);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchItems();
  }, []);

  const generateId = () => `item-${Date.now()}-${Math.random()}`;

  const addModule = () => {
    const newModule: Module = {
      title: `Module ${modules.length + 1}`,
      sortOrder: modules.length,
      items: [],
      groups: [],
    };
    onModulesChange([...modules, newModule]);
  };

  const updateModule = (index: number, updates: Partial<Module>) => {
    const updated = [...modules];
    updated[index] = { ...updated[index], ...updates };
    onModulesChange(updated);
  };

  const removeModule = (index: number) => {
    onModulesChange(modules.filter((_, i) => i !== index));
  };

  const addItemToModule = (moduleIndex: number, groupId?: string) => {
    const module = modules[moduleIndex];
    const newItem: QuotationItem = {
      id: generateId(),
      sl: 1,
      unitPrice: 0,
      quantity: 1,
      amount: 0,
    };

    const updated = [...modules];

    if (groupId) {
      // Add to group
      const groupIndex = module.groups.findIndex((g) => g.id === groupId);
      if (groupIndex !== -1) {
        const group = module.groups[groupIndex];
        const itemsInGroup = group.items.length;
        newItem.sl = itemsInGroup + 1;
        updated[moduleIndex].groups[groupIndex].items.push(newItem);
        // Update group quantity
        updated[moduleIndex].groups[groupIndex].quantity =
          updated[moduleIndex].groups[groupIndex].items.length;
      }
    } else {
      // Add to module directly
      const itemsInModule = module.items.length;
      newItem.sl = itemsInModule + 1;
      updated[moduleIndex].items.push(newItem);
    }

    onModulesChange(updated);
  };

  const addGroupToModule = (moduleIndex: number) => {
    const module = modules[moduleIndex];
    const newGroup: ItemGroup = {
      id: generateId(),
      description: `Group ${module.groups.length + 1}`,
      sortOrder: module.groups.length,
      items: [],
      quantity: 0,
      isExpanded: true,
    };
    const updated = [...modules];
    updated[moduleIndex].groups.push(newGroup);
    onModulesChange(updated);
  };

  const updateItem = (
    moduleIndex: number,
    itemIndex: number,
    groupIndex: number | undefined,
    updates: Partial<QuotationItem>
  ) => {
    const updated = [...modules];
    let item: QuotationItem;

    if (groupIndex !== undefined) {
      item = updated[moduleIndex].groups[groupIndex].items[itemIndex];
    } else {
      item = updated[moduleIndex].items[itemIndex];
    }

    const updatedItem = { ...item, ...updates };

    // Calculate amount
    if (updates.unitPrice !== undefined || updates.quantity !== undefined) {
      updatedItem.amount =
        (updatedItem.unitPrice || 0) * (updatedItem.quantity || 0);
    }

    if (groupIndex !== undefined) {
      updated[moduleIndex].groups[groupIndex].items[itemIndex] = updatedItem;
      // Update group quantity
      updated[moduleIndex].groups[groupIndex].quantity =
        updated[moduleIndex].groups[groupIndex].items.length;
    } else {
      updated[moduleIndex].items[itemIndex] = updatedItem;
    }

    onModulesChange(updated);
  };

  const removeItem = (
    moduleIndex: number,
    itemIndex: number,
    groupIndex: number | undefined
  ) => {
    const updated = [...modules];

    if (groupIndex !== undefined) {
      updated[moduleIndex].groups[groupIndex].items = updated[moduleIndex].groups[
        groupIndex
      ].items.filter((_, i) => i !== itemIndex);
      // Recalculate SL numbers
      updated[moduleIndex].groups[groupIndex].items.forEach((item, i) => {
        item.sl = i + 1;
      });
      // Update group quantity
      updated[moduleIndex].groups[groupIndex].quantity =
        updated[moduleIndex].groups[groupIndex].items.length;
    } else {
      updated[moduleIndex].items = updated[moduleIndex].items.filter(
        (_, i) => i !== itemIndex
      );
      // Recalculate SL numbers
      updated[moduleIndex].items.forEach((item, i) => {
        item.sl = i + 1;
      });
    }

    onModulesChange(updated);
  };

  const updateGroup = (
    moduleIndex: number,
    groupIndex: number,
    updates: Partial<ItemGroup>
  ) => {
    const updated = [...modules];
    updated[moduleIndex].groups[groupIndex] = {
      ...updated[moduleIndex].groups[groupIndex],
      ...updates,
    };
    onModulesChange(updated);
  };

  const removeGroup = (moduleIndex: number, groupIndex: number) => {
    const updated = [...modules];
    updated[moduleIndex].groups = updated[moduleIndex].groups.filter(
      (_, i) => i !== groupIndex
    );
    onModulesChange(updated);
  };

  const toggleGroupExpanded = (moduleIndex: number, groupIndex: number) => {
    const updated = [...modules];
    const group = updated[moduleIndex].groups[groupIndex];
    group.isExpanded = !group.isExpanded;
    onModulesChange(updated);
  };

  const handleDragEnd = (event: DragEndEvent, moduleIndex: number) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const module = modules[moduleIndex];
    const activeId = active.id as string;
    const overId = over.id as string;

    // Find active and over items
    let activeItem: QuotationItem | null = null;
    let overItem: QuotationItem | null = null;
    let activeGroupIndex: number | undefined = undefined;
    let overGroupIndex: number | undefined = undefined;
    let activeItemIndex = -1;
    let overItemIndex = -1;

    // Search in module items
    activeItemIndex = module.items.findIndex((item) => item.id === activeId);
    if (activeItemIndex !== -1) {
      activeItem = module.items[activeItemIndex];
    }

    // Search in groups
    if (!activeItem) {
      for (let i = 0; i < module.groups.length; i++) {
        const index = module.groups[i].items.findIndex(
          (item) => item.id === activeId
        );
        if (index !== -1) {
          activeItem = module.groups[i].items[index];
          activeGroupIndex = i;
          activeItemIndex = index;
          break;
        }
      }
    }

    // Find over item
    overItemIndex = module.items.findIndex((item) => item.id === overId);
    if (overItemIndex !== -1) {
      overItem = module.items[overItemIndex];
    } else {
      for (let i = 0; i < module.groups.length; i++) {
        const index = module.groups[i].items.findIndex(
          (item) => item.id === overId
        );
        if (index !== -1) {
          overItem = module.groups[i].items[index];
          overGroupIndex = i;
          overItemIndex = index;
          break;
        }
      }
    }

    if (!activeItem || !overItem) return;

    const updated = [...modules];

    // Same container (module or same group)
    if (
      activeGroupIndex === undefined &&
      overGroupIndex === undefined
    ) {
      // Both in module items
      updated[moduleIndex].items = arrayMove(
        module.items,
        activeItemIndex,
        overItemIndex
      );
      // Recalculate SL
      updated[moduleIndex].items.forEach((item, i) => {
        item.sl = i + 1;
      });
    } else if (
      activeGroupIndex !== undefined &&
      overGroupIndex !== undefined &&
      activeGroupIndex === overGroupIndex
    ) {
      // Both in same group
      updated[moduleIndex].groups[activeGroupIndex].items = arrayMove(
        module.groups[activeGroupIndex].items,
        activeItemIndex,
        overItemIndex
      );
      // Recalculate SL
      updated[moduleIndex].groups[activeGroupIndex].items.forEach(
        (item, i) => {
          item.sl = i + 1;
        }
      );
    } else {
      // Moving between containers
      // Remove from source
      if (activeGroupIndex !== undefined) {
        updated[moduleIndex].groups[activeGroupIndex].items.splice(
          activeItemIndex,
          1
        );
        updated[moduleIndex].groups[activeGroupIndex].quantity =
          updated[moduleIndex].groups[activeGroupIndex].items.length;
      } else {
        updated[moduleIndex].items.splice(activeItemIndex, 1);
      }

      // Add to destination
      if (overGroupIndex !== undefined) {
        const insertIndex =
          overItemIndex === -1
            ? updated[moduleIndex].groups[overGroupIndex].items.length
            : overItemIndex;
        updated[moduleIndex].groups[overGroupIndex].items.splice(
          insertIndex,
          0,
          activeItem
        );
        // Recalculate SL
        updated[moduleIndex].groups[overGroupIndex].items.forEach(
          (item, i) => {
            item.sl = i + 1;
          }
        );
        updated[moduleIndex].groups[overGroupIndex].quantity =
          updated[moduleIndex].groups[overGroupIndex].items.length;
      } else {
        const insertIndex =
          overItemIndex === -1
            ? updated[moduleIndex].items.length
            : overItemIndex;
        updated[moduleIndex].items.splice(insertIndex, 0, activeItem);
        // Recalculate SL
        updated[moduleIndex].items.forEach((item, i) => {
          item.sl = i + 1;
        });
      }
    }

    onModulesChange(updated);
  };

  const calculateModuleTotal = (module: Module): number => {
    let total = module.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    module.groups.forEach((group) => {
      total += group.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    });
    if (module.discount) {
      total = total * (1 - module.discount / 100);
    }
    return total;
  };

  const grandTotal = modules.reduce(
    (sum, module) => sum + calculateModuleTotal(module),
    0
  );

  // Get all item IDs for sortable context
  const getAllItemIds = (module: Module): string[] => {
    const ids: string[] = [];
    module.items.forEach((item) => ids.push(item.id));
    module.groups.forEach((group) => {
      group.items.forEach((item) => ids.push(item.id));
    });
    return ids;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Quotation Items</h2>
        <Button type="button" onClick={addModule} size="sm">
          <FiPlus className="w-4 h-4 mr-2" />
          Add Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No modules added. Click "Add Module" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((module, moduleIndex) => {
            const moduleTotal = calculateModuleTotal(module);
            const isEditing = editingModule === `${moduleIndex}`;
            const allItemIds = getAllItemIds(module);

            return (
              <DndContext
                key={moduleIndex}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, moduleIndex)}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {isEditing ? (
                          <Input
                            value={module.title}
                            onChange={(e) =>
                              updateModule(moduleIndex, { title: e.target.value })
                            }
                            className="font-semibold mb-2"
                            onBlur={() => setEditingModule(null)}
                            autoFocus
                          />
                        ) : (
                          <CardTitle
                            className="text-base cursor-pointer"
                            onClick={() => setEditingModule(`${moduleIndex}`)}
                          >
                            {module.title}
                          </CardTitle>
                        )}
                        {module.note && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {module.note}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline">
                          {formatCurrency(moduleTotal)}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeModule(moduleIndex)}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Module Actions */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addGroupToModule(moduleIndex)}
                      >
                        <FiPlus className="w-4 h-4 mr-2" />
                        Add Group
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItemToModule(moduleIndex)}
                      >
                        <FiPlus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <SortableContext
                      items={allItemIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {/* Groups - Show First */}
                        {module.groups.map((group, groupIndex) => (
                          <Card
                            key={group.id}
                            className="border px-[-2] bg-muted/30"
                          >
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <div className="flex-1 flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      toggleGroupExpanded(moduleIndex, groupIndex)
                                    }
                                    className="h-6 w-6 p-0"
                                  >
                                    {group.isExpanded ? (
                                      <FiChevronUp className="w-4 h-4" />
                                    ) : (
                                      <FiChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <div className="flex-1 grid grid-cols-3 gap-2 pb-4">
                                    <Input
                                      value={group.code || ''}
                                      onChange={(e) =>
                                        updateGroup(moduleIndex, groupIndex, {
                                          code: e.target.value,
                                        })
                                      }
                                      placeholder="Group Code"
                                      className="h-8 text-xs"
                                    />
                                    <Input
                                      value={group.description}
                                      onChange={(e) =>
                                        updateGroup(moduleIndex, groupIndex, {
                                          description: e.target.value,
                                        })
                                      }
                                      placeholder="Group Description"
                                      className="h-8 text-xs"
                                    />
                                    <div className="flex items-center gap-2 justify-end">
                                      <Label className="text-xs whitespace-nowrap">
                                        Qty: {group.quantity || 0}
                                      </Label>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          removeGroup(moduleIndex, groupIndex)
                                        }
                                        className="h-8 w-8 p-0"
                                      >
                                        <FiTrash2 className="w-4 h-4 text-red-500" />
                                      </Button>
                                      {group.isExpanded && (
                                        <div className="">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              addItemToModule(moduleIndex, group.id)
                                            }
                                            className="h-7 text-xs"
                                          >
                                            <FiPlus className="w-3 h-3 mr-1" />
                                            Add Item to Group
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                             
                            </CardHeader>

                            {group.isExpanded && group.items.length > 0 && (
                              <CardContent>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-8"></TableHead>
                                        <TableHead className="w-12">SL</TableHead>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="w-56">Dimensions</TableHead>
                                        <TableHead className="w-24">Qty</TableHead>
                                        <TableHead className="w-32">Unit Price</TableHead>
                                        <TableHead className="w-32 text-right">Amount</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.items.map((item, itemIndex) => (
                                        <SortableItem
                                          key={item.id}
                                          item={item}
                                          moduleIndex={moduleIndex}
                                          itemIndex={itemIndex}
                                          groupIndex={groupIndex}
                                          catalogItems={catalogItems}
                                          onUpdate={(updates) =>
                                            updateItem(
                                              moduleIndex,
                                              itemIndex,
                                              groupIndex,
                                              updates
                                            )
                                          }
                                          onRemove={() =>
                                            removeItem(
                                              moduleIndex,
                                              itemIndex,
                                              groupIndex
                                            )
                                          }
                                        />
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))}

                        {/* Direct Module Items - Show After Groups */}
                        {module.items.length > 0 && (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-8"></TableHead>
                                  <TableHead className="w-12">SL</TableHead>
                                  <TableHead>Code</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="w-56">Dimensions</TableHead>
                                  <TableHead className="w-24">Qty</TableHead>
                                  <TableHead className="w-32">Unit Price</TableHead>
                                  <TableHead className="w-32 text-right">Amount</TableHead>
                                  <TableHead className="w-12"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {module.items.map((item, itemIndex) => (
                                  <SortableItem
                                    key={item.id}
                                    item={item}
                                    moduleIndex={moduleIndex}
                                    itemIndex={itemIndex}
                                    catalogItems={catalogItems}
                                    onUpdate={(updates) =>
                                      updateItem(
                                        moduleIndex,
                                        itemIndex,
                                        undefined,
                                        updates
                                      )
                                    }
                                    onRemove={() =>
                                      removeItem(moduleIndex, itemIndex, undefined)
                                    }
                                  />
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </CardContent>
                </Card>
              </DndContext>
            );
          })}
        </div>
      )}

      {/* Grand Total */}
      <Card className="bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Label className="text-base font-semibold">Grand Total</Label>
            <div className="text-2xl font-bold">{formatCurrency(grandTotal)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
