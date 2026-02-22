'use client';

import { useState, useEffect, useMemo, useRef, startTransition, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/formatters';
import { calculateKitchenModule, type AreaUnit } from '@/lib/calculateKitchenModule';
import { FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiSearch, FiLayers, FiPackage, FiEdit3, FiGrid } from 'react-icons/fi';
import { BsGripVertical } from 'react-icons/bs';
import { getModuleGroupById } from '@/app/(dashboard)/dashboard/items/groups/_actions/group.action';
import { useAppDispatch } from '@/lib/redux/hooks';
import { updateSectionNote, updateSectionDiscount } from '@/lib/redux/slices/quotationSlice';
import { useCatalogData } from '@/hooks/useCatalogData';
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
  no?: string; // Changed from number | string to string only
  code?: string;
  description?: string;
  height?: number;
  width?: number;
  depth?: number;
  unit?: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
  amount: number;
  itemId?: string; // Reference to catalog item
  moduleGroupItemId?: string; // Reference to selected module group item
  isCustomItem?: boolean; // Flag to mark items added via "Custom Item" button
}

interface CatalogItem {
  id: string;
  code: string;
  description: string;
  unitPrice: number;
  categories: Array<{
    id: string;
    name: string;
  }>;
  unit: {
    id: string;
    symbol: string;
  } | null;
}

interface ItemGroup {
  id: string;
  code?: string;
  description: string;
  quantity?: number;
  sortOrder: number;
  items: QuotationItem[];
  isExpanded?: boolean;
  moduleGroupId?: string | null; // Reference to ModuleGroup template
  baseUnit?: string | null; // Base unit from ModuleGroup (sqft, sqm, sqin)
  baseUnitPrice?: number | null; // Base unit price from ModuleGroup
}

interface CategoryGroup {
  id: string;
  categoryId?: string;
  sortOrder: number;
  items: QuotationItem[];
  isExpanded?: boolean;
}

interface Section {
  id?: string;
  title: string;
  note?: string;
  discount?: number;
  total?: number;
  grandTotal?: number;
  sortOrder: number;
  categoryId?: string;
  items: QuotationItem[];
  groups: ItemGroup[];
  categoryGroups?: CategoryGroup[];
}

interface QuotationItemsAreaProps {
  sections: Section[];
  onSectionsChange: (sections: Section[]) => void;
}

// Sortable Item Component - Memoized for performance
const SortableItem = memo(function SortableItem({
  item,
  groupIndex,
  onUpdate,
  onRemove,
  catalogItems,
  sectionCategoryId,
  units,
  isLoadingUnits,
  groupModuleGroupItems,
  groupModuleGroupId,
}: {
  item: QuotationItem;
  groupIndex?: number;
  onUpdate: (updates: Partial<QuotationItem>) => void;
  onRemove: () => void;
  catalogItems: CatalogItem[];
  sectionCategoryId?: string;
  units?: Array<{ id: string; symbol: string; details: string }>;
  isLoadingUnits?: boolean;
  groupModuleGroupItems?: Array<{
    id: string;
    sl: number;
    code?: string;
    description?: string;
    height?: number;
    width?: number;
    depth?: number;
    unit?: string;
    unitPrice: number;
    amount: number;
    quantity: number;
    itemId?: string;
  }>;
  groupModuleGroupId?: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const [itemSearch, setItemSearch] = useState('');
  const [groupItemSearch, setGroupItemSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleItemSelect = (itemId: string) => {
    if (itemId === 'manual') {
      onUpdate({ itemId: undefined, unit: undefined });
      return;
    }

    const selectedItem = catalogItems.find((i) => i.id === itemId);
    if (selectedItem) {
      onUpdate({
        itemId: selectedItem.id,
        code: selectedItem.code,
        description: selectedItem.description,
        unitPrice: Number(selectedItem.unitPrice),
        unit: selectedItem.unit?.symbol || undefined,
      });
    }
  };

  const handleGroupItemSelect = (groupItemId: string) => {
    if (!groupModuleGroupItems) return;

    if (groupItemId === 'manual') {
      // Allow manual entry when no module group item is chosen
      onUpdate({
        moduleGroupItemId: undefined,
        itemId: undefined,
      });
      return;
    }

    const selectedGroupItem = groupModuleGroupItems.find((i) => i.id === groupItemId);
    if (selectedGroupItem) {
      // For group items: unitPrice = selected item's amount, amount = quantity × unitPrice
      const quantity = selectedGroupItem.quantity && selectedGroupItem.quantity > 0 ? selectedGroupItem.quantity : 1;
      const unitPrice = selectedGroupItem.amount; // Use amount as unitPrice
      const amount = quantity * unitPrice; // Simple calculation: quantity × unitPrice
      
      const updates: Partial<QuotationItem> = {
        moduleGroupItemId: selectedGroupItem.id,
        code: selectedGroupItem.code,
        description: selectedGroupItem.description,
        height: selectedGroupItem.height,
        width: selectedGroupItem.width,
        depth: selectedGroupItem.depth,
        unit: selectedGroupItem.unit,
        unitPrice: unitPrice,
        quantity: quantity,
        amount: amount,
        itemId: selectedGroupItem.itemId,
        isCustomItem: false, // Clear custom item flag when selecting from ModuleGroup
      };
      onUpdate(updates);
    }
  };

  // Filter items based on search and category
  const filteredItems = catalogItems.filter((catalogItem) => {
    // Filter by category if section has a category selected
    if (sectionCategoryId) {
      const hasCategory = catalogItem.categories.some((cat) => cat.id === sectionCategoryId);
      if (!hasCategory) return false;
    }
    
    // Filter by search
    const searchLower = itemSearch.toLowerCase();
    const matchesSearch =
      catalogItem.code.toLowerCase().includes(searchLower) ||
      catalogItem.description.toLowerCase().includes(searchLower) ||
      catalogItem.categories.some((cat) => cat.name.toLowerCase().includes(searchLower));
    return matchesSearch;
  });

  // Filter group items based on search
  const filteredGroupItems = groupModuleGroupItems?.filter((groupItem) => {
    const searchLower = groupItemSearch.toLowerCase();
    const matchesSearch =
      (groupItem.code || '').toLowerCase().includes(searchLower) ||
      (groupItem.description || '').toLowerCase().includes(searchLower);
    return matchesSearch;
  }) || [];

  // Find the selected module group item to display in SelectValue
  const selectedModuleGroupItem = item.moduleGroupItemId 
    ? groupModuleGroupItems?.find((gi) => gi.id === item.moduleGroupItemId)
    : null;

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
        <Input
          type="text"
          value={item.no || ''}
          onChange={(e) => {
            // Always store as string, even if user enters a number
            const no = e.target.value.trim() || undefined;
            onUpdate({ no: no != null ? String(no) : undefined });
          }}
          placeholder="No"
          className="h-8 w-16 text-xs"
        />
      </TableCell>
      <TableCell className="min-w-[120px]">
        {item.isCustomItem ? (
          <Input
            value={item.code || ''}
            onChange={(e) => onUpdate({ code: e.target.value })}
            placeholder="Custom Code"
            className="h-8 text-xs w-full"
          />
        ) : groupIndex !== undefined ? (
          // For regular items, show dropdown if group has moduleGroupId (for "Add Item")
          groupModuleGroupId ? (
            <div className="flex gap-2 items-center w-full">
              <div className="flex-1 relative w-full min-w-0">
                <Select
                  value={item.moduleGroupItemId || 'manual'}
                  onValueChange={handleGroupItemSelect}
                >
                  <SelectTrigger className="h-8 text-xs w-full min-w-0 text-left">
                    <SelectValue placeholder="Select item">
                      {selectedModuleGroupItem 
                        ? (selectedModuleGroupItem.code || selectedModuleGroupItem.description || 'Selected item')
                        : (item.code || 'Select item')
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="manual" className="text-left text-xs">
                      Manual entry
                    </SelectItem>
                    <div className="p-2">
                      <Input
                        placeholder="Search items..."
                        value={groupItemSearch}
                        onChange={(e) => setGroupItemSearch(e.target.value)}
                        className="h-8 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {!groupModuleGroupItems || groupModuleGroupItems.length === 0 ? (
                      <div className="p-2 text-xs text-gray-500 text-left">
                        {groupModuleGroupItems === undefined ? 'Loading items...' : 'No items found'}
                      </div>
                    ) : filteredGroupItems.length === 0 ? (
                      <div className="p-2 text-xs text-gray-500 text-left">No items match your search</div>
                    ) : (
                      filteredGroupItems.map((groupItem) => (
                        <SelectItem key={groupItem.id} value={groupItem.id} className="text-left">
                          <div className="flex flex-col">
                            <span className="font-medium">{groupItem.code || 'No Code'}</span>
                            {groupItem.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {groupItem.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            // Fallback: if no moduleGroupId, show manual input
            <Input
              value={item.code || ''}
              onChange={(e) => onUpdate({ code: e.target.value })}
              placeholder="Code"
              className="h-8 text-xs min-w-[150px]"
            />
          )
        ) : (
          // For non-group items, show item dropdown select
          <div className="flex gap-2 items-center w-full">
            <div className="flex-1 relative w-full min-w-0">
              <Select
                value={item.itemId || 'manual'}
                onValueChange={handleItemSelect}
              >
                <SelectTrigger className="h-8 text-xs w-full min-w-0 text-left">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <div className="p-2">
                    <Input
                      placeholder="Search items..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="h-8 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <SelectItem value="manual" className="text-left">Manual Entry</SelectItem>
                  {filteredItems.length === 0 ? (
                    <div className="p-2 text-xs text-gray-500 text-left">No items found</div>
                  ) : (
                    filteredItems.map((catalogItem) => (
                      <SelectItem key={catalogItem.id} value={catalogItem.id} className="text-left">
                        <div className="flex flex-col">
                          <span className="font-medium">{catalogItem.code}</span>
                          {catalogItem.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {catalogItem.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
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
            step="0.01"
            value={item.height || ''}
            onChange={(e) => {
              const height = e.target.value ? Number(e.target.value) : undefined;
              onUpdate({ height });
            }}
            placeholder="H"
            className="h-8 w-16 text-xs"
          />
          <Input
            type="number"
            step="0.01"
            value={item.width || ''}
            onChange={(e) => {
              const width = e.target.value ? Number(e.target.value) : undefined;
              onUpdate({ width });
            }}
            placeholder="W"
            className="h-8 w-16 text-xs"
          />
          <Input
            type="number"
            step="0.01"
            value={item.depth || ''}
            onChange={(e) => {
              const depth = e.target.value ? Number(e.target.value) : undefined;
              onUpdate({ depth });
            }}
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
          readOnly={!item.isCustomItem}
          className={`h-8 w-24 text-xs ${!item.isCustomItem ? 'bg-muted' : ''}`}
        />
      </TableCell>
      {groupIndex !== undefined && units && (
        <TableCell>
          <Select
            value={units.find((u) => u.symbol === item.unit)?.id || 'none'}
            onValueChange={(value) => {
              if (value === 'none') {
                onUpdate({ unit: undefined });
              } else {
                const selectedUnit = units.find((u) => u.id === value);
                onUpdate({ unit: selectedUnit ? selectedUnit.symbol : undefined });
              }
            }}
            disabled={isLoadingUnits}
          >
            <SelectTrigger className="h-8 w-20 text-xs text-left">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <div className="p-2 border-b">
                <div className="relative">
                  <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search units..."
                    value={unitSearch}
                    onChange={(e) => {
                      e.stopPropagation();
                      setUnitSearch(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        e.preventDefault();
                      }
                    }}
                    className="pl-8 h-8 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                <SelectItem value="none" className="text-left">None</SelectItem>
                {units
                  .filter((unit) =>
                    unitSearch
                      ? unit.symbol.toLowerCase().includes(unitSearch.toLowerCase()) ||
                        unit.details.toLowerCase().includes(unitSearch.toLowerCase())
                      : true
                  )
                  .map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="text-left">
                      {unit.symbol}
                    </SelectItem>
                  ))}
                {units.filter((unit) =>
                  unitSearch
                    ? unit.symbol.toLowerCase().includes(unitSearch.toLowerCase()) ||
                      unit.details.toLowerCase().includes(unitSearch.toLowerCase())
                    : true
                ).length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                    No units found
                  </div>
                )}
              </div>
            </SelectContent>
          </Select>
        </TableCell>
      )}
      <TableCell className="text-right w-32">
        <Input
          type="number"
          step="0.01"
          value={item.discount || ''}
          onChange={(e) => {
            const discount = e.target.value ? Number(e.target.value) : undefined;
            onUpdate({ discount });
          }}
          placeholder="0.00"
          className="h-8 w-24 text-xs text-right"
          min="0"
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
});

export function QuotationItemsArea({
  sections,
  onSectionsChange,
}: QuotationItemsAreaProps) {
  const dispatch = useAppDispatch();
  
  // Use custom hook for cached catalog data
  const { items: catalogItems, categories, units, moduleGroups, isLoading: isCatalogLoading } = useCatalogData();
  
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState<{ [key: string]: string }>({});
  const [groupSearch, setGroupSearch] = useState<{ [key: string]: string }>({});
  const [moduleGroupItems, setModuleGroupItems] = useState<{ [groupId: string]: Array<{
    id: string;
    sl: number;
    code?: string;
    description?: string;
    height?: number;
    width?: number;
    depth?: number;
    unit?: string;
    unitPrice: number;
    amount: number;
    quantity: number;
    itemId?: string;
  }> }>({});
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Note: Catalog data (items, categories, units, module groups) is now fetched via useCatalogData hook
  // This provides caching and request deduplication across all components

  // Track baseUnit/baseUnitPrice changes using useMemo with stable serialization
  // This is used as a dependency for the useEffect below to only run when baseUnit/baseUnitPrice actually change
  const groupBaseUnitKeys = useMemo(() => {
    // Create a stable string key instead of nested arrays to prevent unnecessary re-renders
    return sections.map((section) => 
      section.groups.map((group) => 
        `${group.id}:${group.baseUnit || ''}:${group.baseUnitPrice || ''}`
      ).join('|')
    ).join('||');
  }, [sections]);

  // Previous groupBaseUnitKeys to detect actual changes
  const prevGroupBaseUnitKeysRef = useRef<string>(groupBaseUnitKeys);

  // Load moduleGroupItems for dropdown and baseUnit/baseUnitPrice as fallback for backward compatibility
  // Note: baseUnit/baseUnitPrice should now be loaded from database via getQuotation,
  // but we keep this as fallback for old quotations that don't have these values stored
  useEffect(() => {
    // Guard: only run if groupBaseUnitKeys actually changed
    if (prevGroupBaseUnitKeysRef.current === groupBaseUnitKeys) {
      return;
    }
    prevGroupBaseUnitKeysRef.current = groupBaseUnitKeys;

    const loadModuleGroupItems = async () => {
      const groupsToLoad: Array<{ groupId: string; moduleGroupId: string; sectionIndex: number; groupIndex: number }> = [];
      
      sections.forEach((section, sectionIndex) => {
        section.groups.forEach((group, groupIndex) => {
          // Load module group items if not already loaded
          // Also check if baseUnit/baseUnitPrice are missing (for backward compatibility)
          if (group.moduleGroupId && 
              (!moduleGroupItems[group.id] || group.baseUnit == null || group.baseUnitPrice == null)) {
            groupsToLoad.push({ 
              groupId: group.id, 
              moduleGroupId: group.moduleGroupId,
              sectionIndex,
              groupIndex,
            });
          }
        });
      });
      
      if (groupsToLoad.length === 0) return;
      
      // Load all module groups in parallel
      const loadPromises = groupsToLoad.map(async ({ groupId, moduleGroupId, sectionIndex, groupIndex }) => {
        const result = await getModuleGroupById(moduleGroupId);
        if (result.success && result.group) {
          return {
            groupId,
            sectionIndex,
            groupIndex,
            items: (result.group.items as any[]).map((item) => ({
              id: item.id,
              sl: item.sl,
              code: item.code || undefined,
              description: item.description || undefined,
              height: item.height || undefined,
              width: item.width || undefined,
              depth: item.depth || undefined,
              unit: item.unit || undefined,
              unitPrice: item.unitPrice,
              amount: item.amount,
              quantity: item.quantity || 0,
              itemId: item.itemId || undefined,
            })),
            baseUnit: result.group.baseUnit || null,
            baseUnitPrice: result.group.price ? Number(result.group.price) : null,
          };
        }
        return null;
      });
      
      const results = await Promise.all(loadPromises);
      const newModuleGroupItems: typeof moduleGroupItems = {};
      const groupsToUpdate: Array<{ sectionIndex: number; groupIndex: number; baseUnit: string | null; baseUnitPrice: number | null }> = [];
      
      results.forEach((result) => {
        if (result) {
          // Always update module group items for dropdown
          newModuleGroupItems[result.groupId] = result.items;
          // Only update baseUnit/baseUnitPrice if they're missing (backward compatibility)
          groupsToUpdate.push({
            sectionIndex: result.sectionIndex,
            groupIndex: result.groupIndex,
            baseUnit: result.baseUnit,
            baseUnitPrice: result.baseUnitPrice,
          });
        }
      });
      
      if (Object.keys(newModuleGroupItems).length > 0) {
        setModuleGroupItems((prev) => ({ ...prev, ...newModuleGroupItems }));
      }
      
      // Update groups with baseUnit and baseUnitPrice only if missing (backward compatibility)
      // Early return to prevent unnecessary deep copies if no updates needed
      if (groupsToUpdate.length === 0) return;
      
      // Only create deep copy when we actually need to update
      // Create a deep copy of sections to avoid mutation errors
      // Include categoryGroups and items for complete deep copy
      const updated = sections.map((section) => ({
        ...section,
        groups: section.groups.map((group) => ({ 
          ...group, 
          items: group.items.map(item => ({ ...item }))
        })),
        items: section.items ? section.items.map(item => ({ ...item })) : [],
        categoryGroups: section.categoryGroups ? section.categoryGroups.map((cg) => ({
          ...cg,
          items: cg.items.map(item => ({ ...item }))
        })) : [],
      }));
      
      groupsToUpdate.forEach(({ sectionIndex, groupIndex, baseUnit, baseUnitPrice }) => {
        const group = updated[sectionIndex]?.groups[groupIndex];
        // Only update if baseUnit or baseUnitPrice are null/undefined (not if they're empty string or 0)
        if (group && (group.baseUnit == null || group.baseUnitPrice == null)) {
          const oldBaseUnit = group.baseUnit;
          const oldBaseUnitPrice = group.baseUnitPrice;
          
          updated[sectionIndex].groups[groupIndex] = {
            ...group,
            baseUnit: group.baseUnit ?? baseUnit,
            baseUnitPrice: group.baseUnitPrice ?? baseUnitPrice,
          };
          
          // If baseUnit/baseUnitPrice just became available, recalculate unitPrice for custom items with dimensions
          const newBaseUnit = updated[sectionIndex].groups[groupIndex].baseUnit;
          const newBaseUnitPrice = updated[sectionIndex].groups[groupIndex].baseUnitPrice;
          
          if ((oldBaseUnit == null || oldBaseUnitPrice == null) && 
              newBaseUnit != null && newBaseUnitPrice != null && newBaseUnitPrice > 0) {
            // Recalculate unitPrice for custom items that have dimensions
            updated[sectionIndex].groups[groupIndex].items = group.items.map((item) => {
              const isCustomItem = item.isCustomItem || !item.moduleGroupItemId;
              if (isCustomItem && item.height && item.width && item.depth && 
                  item.height > 0 && item.width > 0 && item.depth > 0) {
                try {
                  const baseUnitLower = newBaseUnit.toLowerCase();
                  if (baseUnitLower === 'sqft' || baseUnitLower === 'sqm' || baseUnitLower === 'sqin') {
                    const dimensionUnit = item.unit || 'mm';
                    const widthIn = convertToInches(item.width, dimensionUnit);
                    const depthIn = convertToInches(item.depth, dimensionUnit);
                    const heightIn = convertToInches(item.height, dimensionUnit);
                    
                    const result = calculateKitchenModule({
                      widthIn: widthIn,
                      depthIn: depthIn,
                      heightIn: heightIn,
                      shelves: 0,
                      unit: baseUnitLower as AreaUnit,
                      unitPrice: newBaseUnitPrice,
                      qty: 1,
                    });
                    
                    const quantity = item.quantity || 0;
                    const discount = item.discount || 0;
                    
                    return {
                      ...item,
                      unitPrice: result.perModule.cost,
                      amount: Math.max(0, quantity * result.perModule.cost - discount),
                    };
                  }
                } catch (error) {
                  console.error('Error recalculating unit price for item:', error);
                }
              }
              return item;
            });
          }
        }
      });
      
      // Use startTransition for non-urgent state update to prevent blocking UI
      startTransition(() => {
        onSectionsChange(updated);
      });
    };
    
    loadModuleGroupItems();
    // Use groupBaseUnitKeys instead of sections to only run when baseUnit/baseUnitPrice actually change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBaseUnitKeys, moduleGroupItems]);

  // Track if we've already processed initial load
  const hasProcessedInitialLoad = useRef(false);
  const prevRecalcGroupKeysRef = useRef<string>(groupBaseUnitKeys);

  // Recalculate unitPrice for custom items with dimensions when sections load (for edit mode)
  useEffect(() => {
    // Guard: skip if no sections or keys haven't changed
    if (sections.length === 0 || prevRecalcGroupKeysRef.current === groupBaseUnitKeys) {
      return;
    }
    prevRecalcGroupKeysRef.current = groupBaseUnitKeys;

    // Debounce recalculation to avoid rapid successive updates
    const timer = setTimeout(() => {
      console.log('[QuotationItemsArea] Recalculation useEffect triggered');
      
      let hasChanges = false;
      const updated = sections.map((section) => {
        const updatedGroups = section.groups.map((group) => {
          // Only process groups that have baseUnit and baseUnitPrice
          if (!group.baseUnit || !group.baseUnitPrice || group.baseUnitPrice <= 0) {
            console.log('[QuotationItemsArea] Skipping group (no baseUnit/baseUnitPrice):', {
              groupId: group.id,
              description: group.description,
              baseUnit: group.baseUnit,
              baseUnitPrice: group.baseUnitPrice
            });
            return group;
          }
          
          console.log('[QuotationItemsArea] Processing group for recalculation:', {
            groupId: group.id,
            description: group.description,
            baseUnit: group.baseUnit,
            baseUnitPrice: group.baseUnitPrice,
            itemCount: group.items.length
          });

          const baseUnit = group.baseUnit.toLowerCase();
          if (baseUnit !== 'sqft' && baseUnit !== 'sqm' && baseUnit !== 'sqin') {
            return group;
          }

          const updatedItems = group.items.map((item) => {
            // Check if this is a custom item (no moduleGroupItemId)
            const isCustomItem = item.isCustomItem || !item.moduleGroupItemId;
            
            if (!isCustomItem) {
              return item;
            }

            // Check if item has valid dimensions but unitPrice is 0, null, undefined, or NaN
            const hasValidDimensions = item.height != null && item.width != null && item.depth != null &&
              item.height > 0 && item.width > 0 && item.depth > 0;
            
            const needsRecalculation = hasValidDimensions && (
              item.unitPrice === 0 || 
              item.unitPrice == null || 
              isNaN(item.unitPrice)
            );

            console.log('[QuotationItemsArea] Recalc check for item:', {
              itemId: item.id,
              description: item.description,
              hasValidDimensions,
              currentUnitPrice: item.unitPrice,
              needsRecalculation
            });

            if (!needsRecalculation) {
              return item;
            }
            
            console.log('[QuotationItemsArea] Recalculating unitPrice for item:', item.id);

            try {
              const dimensionUnit = item.unit || 'mm';
              const widthIn = convertToInches(item.width!, dimensionUnit);
              const depthIn = convertToInches(item.depth!, dimensionUnit);
              const heightIn = convertToInches(item.height!, dimensionUnit);

              const result = calculateKitchenModule({
                widthIn: widthIn,
                depthIn: depthIn,
                heightIn: heightIn,
                shelves: 0,
                unit: baseUnit as AreaUnit,
                unitPrice: group.baseUnitPrice!,
                qty: 1,
              });

              console.log('[QuotationItemsArea] Recalculation result:', {
                result,
                perModuleCost: result.perModule.cost,
                totalCost: result.total.cost
              });

              const calculatedUnitPrice = result.perModule.cost;
              const quantity = item.quantity || 0;
              const discount = item.discount || 0;
              const calculatedAmount = Math.max(0, quantity * calculatedUnitPrice - discount);

              console.log('[QuotationItemsArea] ✅ Recalculation complete:', {
                itemId: item.id,
                oldUnitPrice: item.unitPrice,
                newUnitPrice: calculatedUnitPrice,
                newAmount: calculatedAmount
              });

              hasChanges = true;
              return {
                ...item,
                unitPrice: calculatedUnitPrice,
                amount: calculatedAmount,
              };
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Error recalculating unit price for item:', error);
              }
              return item;
            }
          });

          if (updatedItems !== group.items) {
            return {
              ...group,
              items: updatedItems,
            };
          }
          return group;
        });

        if (updatedGroups !== section.groups) {
          return {
            ...section,
            groups: updatedGroups,
          };
        }
        return section;
      });

      if (hasChanges) {
        hasProcessedInitialLoad.current = true;
        // Use startTransition for non-urgent update
        startTransition(() => {
          onSectionsChange(updated);
        });
      }
    }, 100); // 100ms debounce

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBaseUnitKeys, sections]);

  // Note: Catalog items and categories are now fetched in the consolidated initial data fetch above
  // This duplicate fetch has been removed for better performance

  const generateId = () => `item-${Date.now()}-${Math.random()}`;

  const addSection = () => {
    const newSection: Section = {
      title: `Section ${sections.length + 1}`,
      sortOrder: sections.length,
      items: [],
      groups: [],
      categoryGroups: [],
    };
    onSectionsChange([...sections, newSection]);
  };

  const updateSection = (index: number, updates: Partial<Section>) => {
    const updated = [...sections];
    const section = { ...updated[index], ...updates };
    // Calculate totals for the updated section
    const totals = calculateSectionTotals(section);
    updated[index] = {
      ...section,
      total: totals.total,
      grandTotal: totals.grandTotal,
    };
    onSectionsChange(updated);
  };

  const removeSection = (index: number) => {
    onSectionsChange(sections.filter((_, i) => i !== index));
  };

  const addItemToSection = (sectionIndex: number, groupId?: string, categoryGroupId?: string, isCustom: boolean = false) => {
    const section = sections[sectionIndex];
    const newItem: QuotationItem = {
      id: generateId(),
      sl: 1,
      no: undefined,
      unitPrice: 0,
      quantity: 1,
      discount: 0,
      amount: 0,
      isCustomItem: isCustom,
    };

    // Create deep copy of sections
    const updated = sections.map((s, idx) => {
      if (idx !== sectionIndex) return s;

      let updatedSection: Section;
      if (categoryGroupId) {
        // Add to category group
        const categoryGroupIndex = (section.categoryGroups || []).findIndex((cg) => cg.id === categoryGroupId);
        if (categoryGroupIndex !== -1) {
          const categoryGroup = section.categoryGroups![categoryGroupIndex];
          const itemsInCategoryGroup = categoryGroup.items.length;
          newItem.sl = itemsInCategoryGroup + 1;
          
          updatedSection = {
            ...s,
            categoryGroups: (s.categoryGroups || []).map((cg, cgIdx) => {
              if (cgIdx !== categoryGroupIndex) return cg;
              const updatedItems = [...cg.items, newItem];
              return {
                ...cg,
                items: updatedItems,
              };
            }),
          };
        } else {
          return s;
        }
      } else if (groupId) {
        // Add to group
        const groupIndex = section.groups.findIndex((g) => g.id === groupId);
        if (groupIndex !== -1) {
          const group = section.groups[groupIndex];
          const itemsInGroup = group.items.length;
          newItem.sl = itemsInGroup + 1;
          // Explicitly set isCustomItem to false so dropdown shows for moduleGroup items
          newItem.isCustomItem = false;
          // Ensure no is string if provided
          if (newItem.no !== undefined) {
            newItem.no = newItem.no != null ? String(newItem.no) : undefined;
          }
          
          updatedSection = {
            ...s,
            groups: s.groups.map((g, gIdx) => {
              if (gIdx !== groupIndex) return g;
              const updatedItems = [...g.items, newItem];
              return {
                ...g,
                items: updatedItems,
                quantity: calculateGroupQuantity(updatedItems),
              };
            }),
          };
        } else {
          return s;
        }
      } else {
        // Add to section directly
        const itemsInSection = section.items.length;
        newItem.sl = itemsInSection + 1;
        // Ensure no is string if provided
        if (newItem.no !== undefined) {
          newItem.no = newItem.no != null ? String(newItem.no) : undefined;
        }
        updatedSection = {
          ...s,
          items: [...s.items, newItem],
        };
      }
      // Calculate totals for the updated section
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    });
    
    onSectionsChange(updated);
  };

  const addCustomItemToGroup = (sectionIndex: number, groupIndex: number) => {
    const section = sections[sectionIndex];
    const group = section.groups[groupIndex];
    
    const newItem: QuotationItem = {
      id: generateId(),
      sl: group.items.length + 1,
      no: undefined,
      unitPrice: 0, // Will be calculated when dimensions are entered
      quantity: 1,
      discount: 0,
      amount: 0,
      unit: group.baseUnit || undefined, // Set unit from group's baseUnit
      isCustomItem: true, // Mark as custom item
    };

    const updated = sections.map((s, idx) => {
      if (idx !== sectionIndex) return s;

      const updatedSection = {
        ...s,
        groups: s.groups.map((g, gIdx) => {
          if (gIdx !== groupIndex) return g;
          const updatedItems = [...g.items, newItem];
          return {
            ...g,
            items: updatedItems,
            quantity: calculateGroupQuantity(updatedItems),
          };
        }),
      };
      
      // Calculate totals for the updated section
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    });

    onSectionsChange(updated);
  };

  const addGroupToSection = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    const newGroup: ItemGroup = {
      id: generateId(),
      description: `Group ${section.groups.length + 1}`,
      sortOrder: section.groups.length,
      items: [],
      quantity: 0,
      isExpanded: true,
      baseUnit: null,
      baseUnitPrice: null,
    };
    
    // Create deep copy with new group added
    const updated = sections.map((s, idx) => {
      if (idx !== sectionIndex) return s;
      const updatedSection = {
        ...s,
        groups: [...s.groups, newGroup],
      };
      // Calculate totals for the updated section (should be same since group is empty)
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    });
    
    onSectionsChange(updated);
  };

  const addCategoryGroupToSection = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    const newCategoryGroup: CategoryGroup = {
      id: generateId(),
      sortOrder: (section.categoryGroups?.length || 0),
      items: [],
      isExpanded: true,
    };
    
    // Create deep copy with new category group added
    const updated = sections.map((s, idx) => {
      if (idx !== sectionIndex) return s;
      const updatedSection = {
        ...s,
        categoryGroups: [...(s.categoryGroups || []), newCategoryGroup],
      };
      // Calculate totals for the updated section
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    });
    
    onSectionsChange(updated);
  };

  const removeCategoryGroup = (sectionIndex: number, categoryGroupIndex: number) => {
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;
      const updatedSection = {
        ...s,
        categoryGroups: (s.categoryGroups || []).filter((_, i) => i !== categoryGroupIndex),
      };
      // Calculate totals for the updated section
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    });
    onSectionsChange(updated);
  };

  const updateCategoryGroup = (
    sectionIndex: number,
    categoryGroupIndex: number,
    updates: Partial<CategoryGroup>
  ) => {
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;
      const updatedSection = {
        ...s,
        categoryGroups: (s.categoryGroups || []).map((cg, cgIdx) => {
          if (cgIdx !== categoryGroupIndex) return cg;
          return { ...cg, ...updates };
        }),
      };
      // Calculate totals for the updated section
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    });
    onSectionsChange(updated);
  };

  const toggleCategoryGroupExpanded = (sectionIndex: number, categoryGroupIndex: number) => {
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;
      const updatedSection = {
        ...s,
        categoryGroups: (s.categoryGroups || []).map((cg, cgIdx) => {
          if (cgIdx !== categoryGroupIndex) return cg;
          return { ...cg, isExpanded: !cg.isExpanded };
        }),
      };
      return updatedSection;
    });
    onSectionsChange(updated);
  };

  const updateItem = (
    sectionIndex: number,
    itemIndex: number,
    groupIndex: number | undefined,
    categoryGroupIndex: number | undefined,
    updates: Partial<QuotationItem>
  ) => {
    // Ensure 'no' field is always a string if provided
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.no !== undefined) {
      normalizedUpdates.no = normalizedUpdates.no != null ? String(normalizedUpdates.no) : undefined;
    }
    
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;

      let updatedSection: Section = s; // Initialize with current section
      if (categoryGroupIndex !== undefined) {
        // Update item in category group
        const categoryGroup = (s.categoryGroups || [])[categoryGroupIndex];
        const item = categoryGroup.items[itemIndex];
        const updatedItem = { ...item, ...normalizedUpdates };

        // Calculate amount based on dimensions and discount
        if (
          updates.unitPrice !== undefined ||
          updates.quantity !== undefined ||
          updates.height !== undefined ||
          updates.width !== undefined ||
          updates.depth !== undefined ||
          updates.discount !== undefined
        ) {
          updatedItem.amount = calculateItemAmount(updatedItem);
        }

        updatedSection = {
          ...s,
          categoryGroups: (s.categoryGroups || []).map((cg, cgIdx) => {
            if (cgIdx !== categoryGroupIndex) return cg;
            const updatedItems = cg.items.map((it, iIdx) => 
              iIdx === itemIndex ? updatedItem : it
            );
            return {
              ...cg,
              items: updatedItems,
            };
          }),
        };
      } else if (groupIndex !== undefined) {
        const group = s.groups[groupIndex];
        const item = group.items[itemIndex];
        const updatedItem = { ...item, ...normalizedUpdates };

        // Check if this is a custom item (isCustomItem flag or no moduleGroupItemId) and group has baseUnitPrice/baseUnit
        const isCustomItem = updatedItem.isCustomItem || !updatedItem.moduleGroupItemId;
        
        // Enhanced guards for baseUnit/baseUnitPrice
        const hasBasePrice = group.baseUnitPrice != null && 
                            group.baseUnitPrice > 0 && 
                            group.baseUnit != null && 
                            group.baseUnit.trim() !== '';
        
        // Validate baseUnit is a valid area unit
        const isValidBaseUnit = hasBasePrice && 
                               group.baseUnit && 
                               (group.baseUnit.toLowerCase() === 'sqft' || 
                                group.baseUnit.toLowerCase() === 'sqm' || 
                                group.baseUnit.toLowerCase() === 'sqin');

        // PRODUCTION DEBUG: Log custom item detection
        console.log('[QuotationItemsArea] updateItem - Custom item check:', {
          itemId: updatedItem.id,
          itemDescription: updatedItem.description,
          isCustomItem,
          hasModuleGroupItemId: !!updatedItem.moduleGroupItemId,
          groupId: group.id,
          groupDescription: group.description,
          groupModuleGroupId: group.moduleGroupId,
          groupBaseUnit: group.baseUnit,
          groupBaseUnitPrice: group.baseUnitPrice,
          hasBasePrice,
          isValidBaseUnit,
          itemDimensions: {
            height: updatedItem.height,
            width: updatedItem.width,
            depth: updatedItem.depth
          },
          willCalculate: isCustomItem && isValidBaseUnit
        });

        // For custom items: auto-generate code from dimensions
        if (isCustomItem && (
          updates.height !== undefined ||
          updates.width !== undefined ||
          updates.depth !== undefined
        )) {
          const h = updatedItem.height;
          const w = updatedItem.width;
          const d = updatedItem.depth;
          
          // Auto-generate code from dimensions
          if (h != null && w != null && d != null && h > 0 && w > 0 && d > 0) {
            const generatedCode = generateItemCode(h, w, d);
            updatedItem.code = generatedCode;
            // Include code in updates to ensure it's saved
            if (!updates.code) {
              updates.code = generatedCode;
            }
          } else {
            // Clear code if dimensions are incomplete
            updatedItem.code = '';
            if (!updates.code) {
              updates.code = '';
            }
          }
        }

        // For custom items with baseUnitPrice: calculate unitPrice from dimensions and unit
        // This should recalculate whenever dimensions or unit change, or when baseUnit/baseUnitPrice become available
        if (isCustomItem && isValidBaseUnit) {
          console.log('[QuotationItemsArea] Starting unitPrice calculation for custom item');
          
          const h = updatedItem.height;
          const w = updatedItem.width;
          const d = updatedItem.depth;
          
          // Check if dimensions changed
          const dimensionsChanged = (
            updates.height !== undefined ||
            updates.width !== undefined ||
            updates.depth !== undefined ||
            updates.unit !== undefined
          );
          
          // Check if all dimensions are present and valid
          const hasValidDimensions = h != null && w != null && d != null && h > 0 && w > 0 && d > 0;
          
          // Recalculate if:
          // 1. Dimensions changed AND all dimensions are valid, OR
          // 2. Item has valid dimensions but unitPrice is 0, null, undefined, or NaN
          const shouldRecalculate = hasValidDimensions && (
            dimensionsChanged || 
            updatedItem.unitPrice === 0 || 
            updatedItem.unitPrice == null || 
            isNaN(updatedItem.unitPrice)
          );
          
          if (shouldRecalculate) {
            console.log('[QuotationItemsArea] shouldRecalculate = true, proceeding with calculation');
            
            try {
              // Additional safety checks before calculation
              if (!group.baseUnit || !group.baseUnitPrice || group.baseUnitPrice <= 0) {
                console.error('[QuotationItemsArea] Calculation blocked - invalid baseUnit/baseUnitPrice:', {
                  baseUnit: group.baseUnit,
                  baseUnitPrice: group.baseUnitPrice
                });
                return; // Skip calculation if baseUnit/baseUnitPrice are invalid
              }
              
              const baseUnit = group.baseUnit.toLowerCase().trim() as AreaUnit;
              
              // Double-check baseUnit is valid
              if (baseUnit !== 'sqft' && baseUnit !== 'sqm' && baseUnit !== 'sqin') {
                return; // Invalid baseUnit, skip calculation
              }
              
              // Validate dimensions are numbers
              if (typeof w !== 'number' || typeof d !== 'number' || typeof h !== 'number' ||
                  isNaN(w) || isNaN(d) || isNaN(h)) {
                return; // Invalid dimensions, skip calculation
              }
              
              // Convert dimensions to inches (calculateKitchenModule expects inches)
              const dimensionUnit = updatedItem.unit || 'mm'; // Default to mm if no unit specified
              const widthIn = convertToInches(w, dimensionUnit);
              const depthIn = convertToInches(d, dimensionUnit);
              const heightIn = convertToInches(h, dimensionUnit);
              
              console.log('[QuotationItemsArea] Calling calculateKitchenModule with:', {
                baseUnit,
                baseUnitPrice: group.baseUnitPrice,
                dimensions: { heightIn, widthIn, depthIn }
              });
              
              // Validate converted dimensions are valid
              if (isNaN(widthIn) || isNaN(depthIn) || isNaN(heightIn) ||
                  widthIn <= 0 || depthIn <= 0 || heightIn <= 0) {
                return; // Invalid converted dimensions, skip calculation
              }
              
              const result = calculateKitchenModule({
                widthIn: widthIn,
                depthIn: depthIn,
                heightIn: heightIn,
                shelves: 0,
                unit: baseUnit,
                unitPrice: group.baseUnitPrice,
                qty: 1, // Calculate per module
              });
              
              console.log('[QuotationItemsArea] calculateKitchenModule result:', {
                result,
                perModuleCost: result?.perModule?.cost,
                totalCost: result?.total?.cost
              });
              
              // Validate calculation result
              if (result && result.perModule && typeof result.perModule.cost === 'number' && !isNaN(result.perModule.cost)) {
                // Set unitPrice to the cost per module
                const calculatedUnitPrice = result.perModule.cost;
                console.log('[QuotationItemsArea] ✅ Setting calculated unitPrice:', calculatedUnitPrice);
                updatedItem.unitPrice = calculatedUnitPrice;
                // Include unitPrice in updates to ensure it triggers recalculation
                updates.unitPrice = calculatedUnitPrice;
              } else {
                console.warn('[QuotationItemsArea] ❌ Invalid calculation result:', result);
              }
            } catch (error) {
              console.error('[QuotationItemsArea] ❌ Error calculating custom item unit price:', error);
              // Don't update unitPrice if calculation fails
            }
          } else {
            console.log('[QuotationItemsArea] shouldRecalculate = false, skipping calculation. Reason:', {
              hasValidDimensions,
              dimensionsChanged,
              currentUnitPrice: updatedItem.unitPrice,
              shouldRecalculate
            });
          }
        }

        // For all group items: simple calculation = (unitPrice × quantity) - discount
        if (
          updates.unitPrice !== undefined ||
          updates.quantity !== undefined ||
          updates.discount !== undefined ||
          updates.height !== undefined ||
          updates.width !== undefined ||
          updates.depth !== undefined ||
          updates.unit !== undefined
        ) {
          const baseAmount = (updatedItem.quantity || 0) * (updatedItem.unitPrice || 0);
          const discount = updatedItem.discount || 0;
          updatedItem.amount = Math.max(0, baseAmount - discount);
        }

        updatedSection = {
          ...s,
          groups: s.groups.map((g, gIdx) => {
            if (gIdx !== groupIndex) return g;
            const updatedItems = g.items.map((it, iIdx) => 
              iIdx === itemIndex ? updatedItem : it
            );
            return {
              ...g,
              items: updatedItems,
              quantity: calculateGroupQuantity(updatedItems),
            };
          }),
        };
      } else {
        const item = s.items[itemIndex];
        const updatedItem = { ...item, ...normalizedUpdates };

        // Calculate amount based on dimensions and discount
        if (
          updates.unitPrice !== undefined ||
          updates.quantity !== undefined ||
          updates.height !== undefined ||
          updates.width !== undefined ||
          updates.depth !== undefined ||
          updates.discount !== undefined
        ) {
          updatedItem.amount = calculateItemAmount(updatedItem);
        }

        updatedSection = {
          ...s,
          items: s.items.map((it, iIdx) => 
            iIdx === itemIndex ? updatedItem : it
          ),
        };
      }
      // Calculate totals for the updated section
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    });

    onSectionsChange(updated as Section[]);
  };

  const removeItem = (
    sectionIndex: number,
    itemIndex: number,
    groupIndex: number | undefined,
    categoryGroupIndex: number | undefined
  ) => {
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;

      let updatedSection: Section = s; // Initialize with current section
      if (categoryGroupIndex !== undefined) {
        // Remove item from category group
        updatedSection = {
          ...s,
          categoryGroups: (s.categoryGroups || []).map((cg, cgIdx) => {
            if (cgIdx !== categoryGroupIndex) return cg;
            const filteredItems = cg.items.filter((_, i) => i !== itemIndex);
            // Recalculate SL numbers
            const itemsWithUpdatedSl = filteredItems.map((item, i) => ({
              ...item,
              sl: i + 1,
            }));
            return {
              ...cg,
              items: itemsWithUpdatedSl,
            };
          }),
        };
      } else if (groupIndex !== undefined) {
        updatedSection = {
          ...s,
          groups: s.groups.map((g, gIdx) => {
            if (gIdx !== groupIndex) return g;
            const filteredItems = g.items.filter((_, i) => i !== itemIndex);
      // Recalculate SL numbers
            const itemsWithUpdatedSl = filteredItems.map((item, i) => ({
              ...item,
              sl: i + 1,
            }));
            return {
              ...g,
              items: itemsWithUpdatedSl,
              quantity: calculateGroupQuantity(itemsWithUpdatedSl),
            };
          }),
        };
    } else {
        const filteredItems = s.items.filter((_, i) => i !== itemIndex);
      // Recalculate SL numbers
        const itemsWithUpdatedSl = filteredItems.map((item, i) => ({
          ...item,
          sl: i + 1,
        }));
        updatedSection = {
          ...s,
          items: itemsWithUpdatedSl,
        };
      }
      // Calculate totals for the updated section
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    }).filter((s): s is Section => s !== undefined);

    onSectionsChange(updated as Section[]);
  };

  const updateGroup = (
    sectionIndex: number,
    groupIndex: number,
    updates: Partial<ItemGroup>
  ) => {
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;
      return {
        ...s,
        groups: s.groups.map((g, gIdx) => {
          if (gIdx !== groupIndex) return g;
          return { ...g, ...updates };
        }),
    };
    });
    onSectionsChange(updated);
  };

  const removeGroup = (sectionIndex: number, groupIndex: number) => {
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;
      const updatedSection = {
        ...s,
        groups: s.groups.filter((_, i) => i !== groupIndex),
      };
      // Calculate totals for the updated section
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    });
    onSectionsChange(updated);
  };

  const toggleGroupExpanded = (sectionIndex: number, groupIndex: number) => {
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;
      return {
        ...s,
        groups: s.groups.map((g, gIdx) => {
          if (gIdx !== groupIndex) return g;
          return { ...g, isExpanded: !g.isExpanded };
        }),
      };
    });
    onSectionsChange(updated);
  };

  const handleDragEnd = (event: DragEndEvent, sectionIndex: number) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const section = sections[sectionIndex];
    const activeId = active.id as string;
    const overId = over.id as string;

    // Find active and over items
    let activeItem: QuotationItem | null = null;
    let overItem: QuotationItem | null = null;
    let activeGroupIndex: number | undefined = undefined;
    let overGroupIndex: number | undefined = undefined;
    let activeCategoryGroupIndex: number | undefined = undefined;
    let overCategoryGroupIndex: number | undefined = undefined;
    let activeItemIndex = -1;
    let overItemIndex = -1;

    // Search in section items
    activeItemIndex = section.items.findIndex((item) => item.id === activeId);
    if (activeItemIndex !== -1) {
      activeItem = section.items[activeItemIndex];
    }

    // Search in groups
    if (!activeItem) {
      for (let i = 0; i < section.groups.length; i++) {
        const index = section.groups[i].items.findIndex(
          (item) => item.id === activeId
        );
        if (index !== -1) {
          activeItem = section.groups[i].items[index];
          activeGroupIndex = i;
          activeItemIndex = index;
          break;
        }
      }
    }

    // Search in category groups
    if (!activeItem && section.categoryGroups) {
      for (let i = 0; i < section.categoryGroups.length; i++) {
        const index = section.categoryGroups[i].items.findIndex(
          (item) => item.id === activeId
        );
        if (index !== -1) {
          activeItem = section.categoryGroups[i].items[index];
          activeCategoryGroupIndex = i;
          activeItemIndex = index;
          break;
        }
      }
    }

    // Find over item
    overItemIndex = section.items.findIndex((item) => item.id === overId);
    if (overItemIndex !== -1) {
      overItem = section.items[overItemIndex];
    } else {
      // Search in groups
      for (let i = 0; i < section.groups.length; i++) {
        const index = section.groups[i].items.findIndex(
          (item) => item.id === overId
        );
        if (index !== -1) {
          overItem = section.groups[i].items[index];
          overGroupIndex = i;
          overItemIndex = index;
          break;
        }
      }
      
      // Search in category groups
      if (!overItem && section.categoryGroups) {
        for (let i = 0; i < section.categoryGroups.length; i++) {
          const index = section.categoryGroups[i].items.findIndex(
            (item) => item.id === overId
          );
          if (index !== -1) {
            overItem = section.categoryGroups[i].items[index];
            overCategoryGroupIndex = i;
            overItemIndex = index;
            break;
          }
        }
      }
    }

    if (!activeItem || !overItem) return;

    // Same container (section, same group, or same category group)
    if (
      activeGroupIndex === undefined &&
      overGroupIndex === undefined &&
      activeCategoryGroupIndex === undefined &&
      overCategoryGroupIndex === undefined
    ) {
      // Both in section items
      const movedItems = arrayMove(
        section.items,
        activeItemIndex,
        overItemIndex
      );
      const itemsWithUpdatedSl = movedItems.map((item, i) => ({
        ...item,
        sl: i + 1,
      }));
      
      const updated = sections.map((s, idx) => {
        if (idx !== sectionIndex) return s;
        const updatedSection = { ...s, items: itemsWithUpdatedSl };
        // Calculate totals for the updated section
        const totals = calculateSectionTotals(updatedSection);
        return {
          ...updatedSection,
          total: totals.total,
          grandTotal: totals.grandTotal,
        };
      });
      onSectionsChange(updated);
    } else if (
      activeGroupIndex !== undefined &&
      overGroupIndex !== undefined &&
      activeGroupIndex === overGroupIndex
    ) {
      // Both in same group
      const group = section.groups[activeGroupIndex];
      const movedItems = arrayMove(
        group.items,
        activeItemIndex,
        overItemIndex
      );
      const itemsWithUpdatedSl = movedItems.map((item, i) => ({
        ...item,
        sl: i + 1,
      }));
      
      const updated = sections.map((s, idx) => {
        if (idx !== sectionIndex) return s;
        const updatedSection = {
          ...s,
          groups: s.groups.map((g, gIdx) => {
            if (gIdx !== activeGroupIndex) return g;
            return {
              ...g,
              items: itemsWithUpdatedSl,
              quantity: calculateGroupQuantity(itemsWithUpdatedSl),
            };
          }),
        };
        // Calculate totals for the updated section
        const totals = calculateSectionTotals(updatedSection);
        return {
          ...updatedSection,
          total: totals.total,
          grandTotal: totals.grandTotal,
        };
      });
      onSectionsChange(updated);
    } else if (
      activeCategoryGroupIndex !== undefined &&
      overCategoryGroupIndex !== undefined &&
      activeCategoryGroupIndex === overCategoryGroupIndex
    ) {
      // Both in same category group
      const categoryGroup = section.categoryGroups![activeCategoryGroupIndex];
      const movedItems = arrayMove(
        categoryGroup.items,
        activeItemIndex,
        overItemIndex
      );
      const itemsWithUpdatedSl = movedItems.map((item, i) => ({
        ...item,
        sl: i + 1,
      }));
      
      const updated = sections.map((s, idx) => {
        if (idx !== sectionIndex) return s;
        const updatedSection = {
          ...s,
          categoryGroups: (s.categoryGroups || []).map((cg, cgIdx) => {
            if (cgIdx !== activeCategoryGroupIndex) return cg;
            return {
              ...cg,
              items: itemsWithUpdatedSl,
            };
          }),
        };
        // Calculate totals for the updated section
        const totals = calculateSectionTotals(updatedSection);
        return {
          ...updatedSection,
          total: totals.total,
          grandTotal: totals.grandTotal,
        };
      });
      onSectionsChange(updated);
    } else {
      // Moving between containers
      const updated = sections.map((s, idx) => {
        if (idx !== sectionIndex) return s;
        
        // Remove from source
        let newItems = [...s.items];
        const newGroups = s.groups.map((g) => ({ ...g, items: [...g.items] }));
        const newCategoryGroups = (s.categoryGroups || []).map((cg) => ({ ...cg, items: [...cg.items] }));
        
        if (activeGroupIndex !== undefined) {
          newGroups[activeGroupIndex].items = newGroups[activeGroupIndex].items.filter(
            (_, i) => i !== activeItemIndex
          );
          newGroups[activeGroupIndex].quantity = calculateGroupQuantity(newGroups[activeGroupIndex].items);
        } else if (activeCategoryGroupIndex !== undefined) {
          newCategoryGroups[activeCategoryGroupIndex].items = newCategoryGroups[activeCategoryGroupIndex].items.filter(
            (_, i) => i !== activeItemIndex
          );
        } else {
          newItems = newItems.filter((_, i) => i !== activeItemIndex);
        }

        // Add to destination (activeItem is guaranteed to be non-null here)
        if (activeItem) {
          if (overGroupIndex !== undefined) {
            const insertIndex =
              overItemIndex === -1
                ? newGroups[overGroupIndex].items.length
                : overItemIndex;
            newGroups[overGroupIndex].items.splice(insertIndex, 0, activeItem);
            // Recalculate SL
            newGroups[overGroupIndex].items = newGroups[overGroupIndex].items.map(
              (item, i) => ({ ...item, sl: i + 1 })
            );
            newGroups[overGroupIndex].quantity = calculateGroupQuantity(newGroups[overGroupIndex].items);
          } else if (overCategoryGroupIndex !== undefined) {
            const insertIndex =
              overItemIndex === -1
                ? newCategoryGroups[overCategoryGroupIndex].items.length
                : overItemIndex;
            newCategoryGroups[overCategoryGroupIndex].items.splice(insertIndex, 0, activeItem);
            // Recalculate SL
            newCategoryGroups[overCategoryGroupIndex].items = newCategoryGroups[overCategoryGroupIndex].items.map(
              (item, i) => ({ ...item, sl: i + 1 })
            );
          } else {
            const insertIndex =
              overItemIndex === -1
                ? newItems.length
                : overItemIndex;
            newItems.splice(insertIndex, 0, activeItem);
            // Recalculate SL
            newItems = newItems.map((item, i) => ({ ...item, sl: i + 1 }));
          }
        }

        const updatedSection = {
          ...s,
          items: newItems,
          groups: newGroups,
          categoryGroups: newCategoryGroups,
        };
        // Calculate totals for the updated section
        const totals = calculateSectionTotals(updatedSection);
        return {
          ...updatedSection,
          total: totals.total,
          grandTotal: totals.grandTotal,
        };
      });
      onSectionsChange(updated);
    }
  };

  // Generate item code from H-W-D dimensions (format: "HH-WW-DD")
  const generateItemCode = (height?: number, width?: number, depth?: number): string => {
    const getFirstTwoDigits = (value?: number): string => {
      if (!value || value <= 0) return "00";
      const str = Math.floor(value).toString();
      return str.length >= 2 ? str.substring(0, 2) : str.padStart(2, "0");
    };

    const h = getFirstTwoDigits(height);
    const w = getFirstTwoDigits(width);
    const d = getFirstTwoDigits(depth);
    
    return `${h}-${w}-${d}`;
  };

  // Convert dimension to inches based on unit
  const convertToInches = (value: number, unit?: string): number => {
    if (!unit) {
      // Default to mm if no unit specified (common for dimensions)
      return value / 25.4;
    }
    
    const unitLower = unit.toLowerCase();
    switch (unitLower) {
      case 'mm':
        return value / 25.4; // 1 inch = 25.4 mm
      case 'cm':
        return value / 2.54; // 1 inch = 2.54 cm
      case 'm':
        return value * 39.3701; // 1 m = 39.3701 inches
      case 'inch':
      case 'in':
        return value; // Already in inches
      case 'ft':
        return value * 12; // 1 ft = 12 inches
      default:
        // Default to mm if unit is not recognized
        return value / 25.4;
    }
  };

  // Calculate item amount based on dimensions
  const calculateItemAmount = (item: QuotationItem, isGroupItem: boolean = false): number => {
    const h = item.height;
    const w = item.width;
    const d = item.depth;
    const unitPrice = item.unitPrice || 0;
    const quantity = item.quantity || 0;
    const discount = item.discount || 0;

    let baseAmount = 0;

    // For group items, use kitchen module calculation if dimensions are present
    if (isGroupItem && h != null && w != null && d != null && h > 0 && w > 0 && d > 0) {
      try {
        // Check if the unit is a valid area unit for kitchen module calculation
        const unit = item.unit?.toLowerCase();
        if (unit === 'sqft' || unit === 'sqm' || unit === 'sqin') {
          const result = calculateKitchenModule({
            widthIn: w,
            depthIn: d,
            heightIn: h,
            shelves: 0, // Default to 0 shelves, can be extended later
            unit: unit as AreaUnit,
            unitPrice: unitPrice,
            qty: quantity,
          });
          baseAmount = result.total.cost;
        } else {
          // If unit is not a valid area unit, fall back to standard calculation
          baseAmount = h * w * d * unitPrice * quantity;
        }
      } catch (error) {
        console.error('Error calculating kitchen module:', error);
        // Fall back to standard calculation on error
        baseAmount = h * w * d * unitPrice * quantity;
      }
    } else if (h != null && w != null && d != null && h > 0 && w > 0 && d > 0) {
      // If height, width, and depth are all present and non-zero, use: h * w * d * unitPrice * quantity
      baseAmount = h * w * d * unitPrice * quantity;
    } else {
      // Otherwise: unitPrice * quantity
      baseAmount = unitPrice * quantity;
    }
    
    // Apply item discount: subtract discount from base amount
    return Math.max(0, baseAmount - discount);
  };

  // Calculate group quantity as sum of all item quantities
  const calculateGroupQuantity = (items: QuotationItem[]): number => {
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  // Calculate section totals (total and grandTotal)
  const calculateSectionTotals = (section: Section) => {
    // Calculate module group total (sum of all groups' items)
    const moduleGroupTotal = section.groups.reduce((sum, group) => {
      return sum + group.items.reduce((groupSum, item) => groupSum + (item.amount || 0), 0);
    }, 0);

    // Calculate items category total (sum of all categoryGroups' items)
    const itemsCategoryTotal = (section.categoryGroups || []).reduce((sum, categoryGroup) => {
      return sum + categoryGroup.items.reduce((categorySum, item) => categorySum + (item.amount || 0), 0);
    }, 0);

    // Calculate items total (sum of direct items)
    const itemsTotal = section.items.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Section total = module group total + items category total + items total
    const sectionTotal = moduleGroupTotal + itemsCategoryTotal + itemsTotal;

    // Calculate grandTotal = total - discount
    const discount = section.discount || 0;
    const grandTotal = Math.max(0, sectionTotal - discount);
    
    return {
      total: sectionTotal,
      grandTotal: grandTotal,
    };
  };

  const calculateSectionTotal = (section: Section): number => {
    const totals = calculateSectionTotals(section);
    return totals.grandTotal;
  };

  const grandTotal = sections.reduce(
    (sum, section) => sum + calculateSectionTotal(section),
    0
  );

  // Get all item IDs for sortable context
  const getAllItemIds = (section: Section): string[] => {
    const ids: string[] = [];
    section.items.forEach((item) => ids.push(item.id));
    section.groups.forEach((group) => {
      group.items.forEach((item) => ids.push(item.id));
    });
    if (section.categoryGroups) {
      section.categoryGroups.forEach((categoryGroup) => {
        categoryGroup.items.forEach((item) => ids.push(item.id));
      });
    }
    return ids;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Quotation Items</h2>
        <Button type="button" onClick={addSection} size="sm">
          <FiPlus className="w-4 h-4 mr-2" />
          Add Section
        </Button>
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No sections added. Click &quot;Add Section&quot; to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section, sectionIndex) => {
            const sectionTotal = calculateSectionTotal(section);
            const isEditing = editingSection === `${sectionIndex}`;
            const allItemIds = getAllItemIds(section);

            return (
              <DndContext
                key={sectionIndex}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, sectionIndex)}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {isEditing ? (
                          <Input
                            value={section.title}
                            onChange={(e) =>
                              updateSection(sectionIndex, { title: e.target.value })
                            }
                            className="font-semibold mb-2"
                            onBlur={() => setEditingSection(null)}
                            autoFocus
                          />
                        ) : (
                          <CardTitle
                            className="text-base cursor-pointer"
                            onClick={() => setEditingSection(`${sectionIndex}`)}
                          >
                            {section.title}
                          </CardTitle>
                        )}
                        {section.note && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {section.note}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline">
                          {formatCurrency(sectionTotal)}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSection(sectionIndex)}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Section Actions */}
                    <div className="flex gap-2 mt-3 items-center justify-between">
                      <div className="flex gap-2">
                                            <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addGroupToSection(sectionIndex)}
                        className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                      >
                        <FiLayers className="w-4 h-4 mr-2 text-blue-600" />
                        Add Module Group
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItemToSection(sectionIndex, undefined, undefined, false)}
                        className="bg-green-50 hover:bg-green-100 border-green-200"
                      >
                        <FiPackage className="w-4 h-4 mr-2 text-green-600" />
                        Add Catalog Item
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItemToSection(sectionIndex, undefined, undefined, true)}
                        className="bg-orange-50 hover:bg-orange-100 border-orange-200"
                      >
                        <FiEdit3 className="w-4 h-4 mr-2 text-orange-600" />
                        Add Custom Item
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addCategoryGroupToSection(sectionIndex)}
                      >
                        <FiGrid className="w-4 h-4 mr-2" />
                        Add Category Group
                      </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`section-discount-${sectionIndex}`} className="text-xs whitespace-nowrap">
                          Discount Amount:
                        </Label>
                        <Input
                          id={`section-discount-${sectionIndex}`}
                          type="number"
                          value={section.discount || ''}
                          onChange={(e) => {
                            const discount = e.target.value ? parseFloat(e.target.value) : undefined;
                            updateSection(sectionIndex, { discount });
                            dispatch(updateSectionDiscount({ sectionIndex, discount }));
                          }}
                          placeholder="0.00"
                          className="h-8 text-sm w-32"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <SortableContext
                      items={allItemIds}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {/* Groups - Show First */}
                        {section.groups.map((group, groupIndex) => (
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
                                      toggleGroupExpanded(sectionIndex, groupIndex)
                                    }
                                    className="h-6 w-6 p-0"
                                  >
                                    {group.isExpanded ? (
                                      <FiChevronUp className="w-4 h-4" />
                                    ) : (
                                      <FiChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <div className="flex-1 space-y-2">
                                    {/* Top Row: Group Select, Code, Add Item Button, Delete Button */}
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={group.moduleGroupId || 'none'}
                                        onValueChange={async (moduleGroupId) => {
                                          if (moduleGroupId && moduleGroupId !== 'none') {
                                            // Fetch the ModuleGroup but only populate code and description, NOT items
                                            const result = await getModuleGroupById(moduleGroupId);
                                            if (result.success && result.group) {
                                              const moduleGroup = result.group;
                                              
                                              // Store moduleGroup items for later use in dropdown
                                              setModuleGroupItems(prev => ({
                                                ...prev,
                                                [group.id]: (moduleGroup.items as any[]).map((item) => ({
                                                  id: item.id,
                                                  sl: item.sl,
                                                  code: item.code || undefined,
                                                  description: item.description || undefined,
                                                  height: item.height || undefined,
                                                  width: item.width || undefined,
                                                  depth: item.depth || undefined,
                                                  unit: item.unit || undefined,
                                                  unitPrice: item.unitPrice,
                                                  amount: item.amount,
                                                  quantity: item.quantity || 0,
                                                  itemId: item.itemId || undefined,
                                                }))
                                              }));
                                              
                                              // Update the group with ModuleGroup code, description, baseUnit, and baseUnitPrice, keep existing items
                                              updateGroup(sectionIndex, groupIndex, {
                                                moduleGroupId: moduleGroupId,
                                                code: moduleGroup.code || group.code,
                                                description: moduleGroup.description || group.description,
                                                baseUnit: moduleGroup.baseUnit || null,
                                                baseUnitPrice: moduleGroup.price ? Number(moduleGroup.price) : null,
                                                isExpanded: true, // Auto-expand when ModuleGroup is selected
                                              });
                                            }
                                          } else {
                                            // Clear ModuleGroup selection
                                            setModuleGroupItems(prev => {
                                              const newItems = { ...prev };
                                              delete newItems[group.id];
                                              return newItems;
                                            });
                                            updateGroup(sectionIndex, groupIndex, {
                                              moduleGroupId: null,
                                              baseUnit: null,
                                              baseUnitPrice: null,
                                            });
                                          }
                                        }}
                                        disabled={isCatalogLoading}
                                      >
                                        <SelectTrigger className="h-8 text-xs text-left flex-1">
                                          <SelectValue placeholder="Select Group">
                                            {group.moduleGroupId ? (() => {
                                              const selectedGroup = moduleGroups.find(mg => mg.id === group.moduleGroupId);
                                              return selectedGroup?.code || 'Select Group';
                                            })() : 'Select Group'}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                          <div className="p-2">
                                            <div className="relative">
                                              <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" />
                                              <Input
                                                placeholder="Search groups..."
                                                value={groupSearch[`${sectionIndex}-${groupIndex}`] || ''}
                                                onChange={(e) => {
                                                  setGroupSearch(prev => ({
                                                    ...prev,
                                                    [`${sectionIndex}-${groupIndex}`]: e.target.value,
                                                  }));
                                                }}
                                                onKeyDown={(e) => {
                                                  e.stopPropagation();
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                  }
                                                }}
                                                className="pl-8 h-8 text-xs"
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                            </div>
                                          </div>
                                          <div className="max-h-[200px] overflow-y-auto">
                                            <SelectItem value="none" className="text-left">None</SelectItem>
                                            {moduleGroups
                                              .filter((mg) => {
                                                const search = groupSearch[`${sectionIndex}-${groupIndex}`] || '';
                                                if (!search) return true;
                                                const searchLower = search.toLowerCase();
                                                return (
                                                  mg.code?.toLowerCase().includes(searchLower) ||
                                                  mg.description?.toLowerCase().includes(searchLower)
                                                );
                                              })
                                              .map((mg) => (
                                                <SelectItem key={mg.id} value={mg.id} className="text-left">
                                                  {mg.code || 'Unnamed Group'}
                                                </SelectItem>
                                              ))}
                                          </div>
                                        </SelectContent>
                                      </Select>
                                    {group.isExpanded && (
                                      <>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => addItemToSection(sectionIndex, group.id)}
                                          className="h-8 text-xs"
                                        >
                                          <FiPlus className="w-3 h-3 mr-1" />
                                          Add Item
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => addCustomItemToGroup(sectionIndex, groupIndex)}
                                          className="h-8 text-xs"
                                        >
                                          <FiPlus className="w-3 h-3 mr-1" />
                                          Custom Item
                                        </Button>
                                      </>
                                    )}
                                          <Button
                                            type="button"
                                        variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                          removeGroup(sectionIndex, groupIndex)
                                            }
                                        className="h-8 w-8 p-0"
                                          >
                                        <FiTrash2 className="w-4 h-4 text-red-500" />
                                          </Button>
                                        </div>
                                   
                                  </div>
                                </div>
                              </div>
                             
                            </CardHeader>

                            {group.isExpanded && (
                              <CardContent>
                                {group.items.length > 0 && (
                                  <>
                                   {/* Second Row: Description */}
                                   <Textarea
                                      value={group.description}
                                      onChange={(e) =>
                                        updateGroup(sectionIndex, groupIndex, {
                                          description: e.target.value,
                                        })
                                      }
                                      placeholder="Group Description"
                                      className="text-xs min-h-[20px]"
                                      rows={2}
                                    />
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-8"></TableHead>
                                            <TableHead className="w-12">SL</TableHead>
                                            <TableHead className="w-16">No</TableHead>
                                            <TableHead className="min-w-[120px]">Code</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="w-56">Dimensions</TableHead>
                                            <TableHead className="w-24">Qty</TableHead>
                                            <TableHead className="w-32">Unit Price</TableHead>
                                            <TableHead className="w-32">Unit</TableHead>
                                            <TableHead className="w-32 text-right">Discount</TableHead>
                                            <TableHead className="w-32 text-right">Amount</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {group.items.map((item, itemIndex) => (
                                            <SortableItem
                                              key={item.id}
                                              item={item}
                                              groupIndex={groupIndex}
                                              catalogItems={catalogItems}
                                              sectionCategoryId={section.categoryId}
                                              units={units}
                                              isLoadingUnits={isCatalogLoading}
                                              groupModuleGroupItems={group.moduleGroupId ? moduleGroupItems[group.id] : undefined}
                                              groupModuleGroupId={group.moduleGroupId || null}
                                              onUpdate={(updates) =>
                                                updateItem(
                                                  sectionIndex,
                                                  itemIndex,
                                                  groupIndex,
                                                  undefined,
                                                  updates
                                                )
                                              }
                                              onRemove={() =>
                                                removeItem(
                                                  sectionIndex,
                                                  itemIndex,
                                                  groupIndex,
                                                  undefined
                                                )
                                              }
                                            />
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                    
                                  </>
                                )}
                              </CardContent>
                            )}
                                {/* Group Totals */}
                                <div className="flex justify-end items-center gap-4 py-4 px-4 border-t">
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs font-medium">Total Quantity:</Label>
                                        <span className="text-xs font-semibold">{group.quantity || 0}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs font-medium">Total Amount:</Label>
                                        <span className="text-xs font-semibold">
                                          {formatCurrency(
                                            group.items.reduce((sum, item) => sum + (item.amount || 0), 0)
                                          )}
                                        </span>
                                      </div>
                                    </div>
                          </Card>
                        ))}

                        {/* Category Groups - Show After Groups */}
                        {(section.categoryGroups || []).map((categoryGroup, categoryGroupIndex) => (
                          <Card
                            key={categoryGroup.id}
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
                                      toggleCategoryGroupExpanded(sectionIndex, categoryGroupIndex)
                                    }
                                    className="h-6 w-6 p-0"
                                  >
                                    {categoryGroup.isExpanded ? (
                                      <FiChevronUp className="w-4 h-4" />
                                    ) : (
                                      <FiChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <div className="flex-1 space-y-2">
                                    {/* Top Row: Category Select, Add Item Button, Delete Button */}
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={categoryGroup.categoryId || 'none'}
                                        onValueChange={(categoryId) => {
                                          if (categoryId === 'none') {
                                            updateCategoryGroup(sectionIndex, categoryGroupIndex, {
                                              categoryId: undefined,
                                            });
                                          } else {
                                            updateCategoryGroup(sectionIndex, categoryGroupIndex, {
                                              categoryId: categoryId,
                                            });
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="h-8 text-xs text-left flex-1">
                                          <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                          <div className="p-2 border-b">
                                            <div className="relative">
                                              <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                              <Input
                                                placeholder="Search categories..."
                                                value={categorySearch[`${sectionIndex}-${categoryGroupIndex}`] || ''}
                                                onChange={(e) => {
                                                  setCategorySearch((prev) => ({
                                                    ...prev,
                                                    [`${sectionIndex}-${categoryGroupIndex}`]: e.target.value,
                                                  }));
                                                }}
                                                onKeyDown={(e) => {
                                                  e.stopPropagation();
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                  }
                                                }}
                                                className="pl-8 h-8 text-xs"
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                            </div>
                                          </div>
                                          <div className="max-h-[200px] overflow-y-auto">
                                            <SelectItem value="none" className="text-left">None</SelectItem>
                                            {categories
                                              .filter((category) => {
                                                const search = categorySearch[`${sectionIndex}-${categoryGroupIndex}`] || '';
                                                if (!search) return true;
                                                return category.name.toLowerCase().includes(search.toLowerCase());
                                              })
                                              .map((category) => (
                                                <SelectItem key={category.id} value={category.id} className="text-left">
                                                  {category.name}
                                                </SelectItem>
                                              ))}
                                          </div>
                                        </SelectContent>
                                      </Select>
                                      {categoryGroup.isExpanded && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            addItemToSection(sectionIndex, undefined, categoryGroup.id)
                                          }
                                          className="h-8 text-xs"
                                        >
                                          <FiPlus className="w-3 h-3 mr-1" />
                                          Add Item
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          removeCategoryGroup(sectionIndex, categoryGroupIndex)
                                        }
                                        className="h-8 w-8 p-0"
                                      >
                                        <FiTrash2 className="w-4 h-4 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardHeader>

                            {categoryGroup.isExpanded && (
                              <CardContent>
                                {categoryGroup.items.length > 0 && (
                                  <>
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-8"></TableHead>
                                            <TableHead className="w-12">SL</TableHead>
                                            <TableHead className="min-w-[120px]">Code</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="w-56">Dimensions</TableHead>
                                            <TableHead className="w-24">Qty</TableHead>
                                            <TableHead className="w-32">Unit Price</TableHead>
                                            <TableHead className="w-32 text-right">Amount</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {categoryGroup.items.map((item, itemIndex) => (
                                            <SortableItem
                                              key={item.id}
                                              item={item}
                                              catalogItems={catalogItems}
                                              sectionCategoryId={categoryGroup.categoryId}
                                              onUpdate={(updates) =>
                                                updateItem(
                                                  sectionIndex,
                                                  itemIndex,
                                                  undefined,
                                                  categoryGroupIndex,
                                                  updates
                                                )
                                              }
                                              onRemove={() =>
                                                removeItem(sectionIndex, itemIndex, undefined, categoryGroupIndex)
                                              }
                                            />
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </>
                                )}
                              </CardContent>
                            )}
                            {/* Category Group Totals */}
                            <div className="flex justify-end items-center gap-4 py-4 px-4 border-t">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium">Total Items:</Label>
                                <span className="text-xs font-semibold">{categoryGroup.items.length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs font-medium">Total Amount:</Label>
                                <span className="text-xs font-semibold">
                                  {formatCurrency(
                                    categoryGroup.items.reduce((sum, item) => sum + (item.amount || 0), 0)
                                  )}
                                </span>
                              </div>
                            </div>
                          </Card>
                        ))}

                        {/* Direct Section Items - Show After Groups */}
                        {section.items.length > 0 && (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-8"></TableHead>
                                  <TableHead className="w-12">SL</TableHead>
                                  <TableHead className="min-w-[120px]">Code</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead className="w-56">Dimensions</TableHead>
                                  <TableHead className="w-24">Qty</TableHead>
                                  <TableHead className="w-32">Unit Price</TableHead>
                                  <TableHead className="w-32 text-right">Amount</TableHead>
                                  <TableHead className="w-12"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {section.items.map((item, itemIndex) => (
                                  <SortableItem
                                    key={item.id}
                                    item={item}
                                    catalogItems={catalogItems}
                                    sectionCategoryId={section.categoryId}
                                    onUpdate={(updates) =>
                                      updateItem(
                                        sectionIndex,
                                        itemIndex,
                                        undefined,
                                        undefined,
                                        updates
                                      )
                                    }
                                    onRemove={() =>
                                      removeItem(sectionIndex, itemIndex, undefined, undefined)
                                    }
                                  />
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </SortableContext>

                    {/* Section Note Field */}
                    <div className="mt-4 pt-4 border-t">
                      <Label htmlFor={`section-note-${sectionIndex}`} className="text-xs mb-1">
                        Note
                      </Label>
                      <Textarea
                        id={`section-note-${sectionIndex}`}
                        value={section.note || ''}
                        onChange={(e) => {
                          const note = e.target.value;
                          updateSection(sectionIndex, { note });
                          dispatch(updateSectionNote({ sectionIndex, note }));
                        }}
                        placeholder="Enter section note"
                        className="text-sm min-h-[20px] w-full"
                        rows={2}
                      />
                    </div>
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
