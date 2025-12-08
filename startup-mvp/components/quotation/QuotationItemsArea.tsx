'use client';

import { useState, useEffect } from 'react';
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
import { FiPlus, FiTrash2, FiEdit2, FiChevronDown, FiChevronUp, FiSearch } from 'react-icons/fi';
import { BsGripVertical } from 'react-icons/bs';
import { getActiveItemsForDropdown } from '@/app/actions/items';
import { getActiveCategories } from '@/app/(dashboard)/dashboard/items/_actions/item.action';
import { useAppDispatch } from '@/lib/redux/hooks';
import { updateSectionNote, updateSectionDiscount } from '@/lib/redux/slices/quotationSlice';
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
  unit?: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  itemId?: string; // Reference to catalog item
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
}

interface QuotationItemsAreaProps {
  sections: Section[];
  onSectionsChange: (sections: Section[]) => void;
}

// Sortable Item Component
function SortableItem({
  item,
  sectionIndex,
  itemIndex,
  groupIndex,
  onUpdate,
  onRemove,
  catalogItems,
  sectionCategoryId,
}: {
  item: QuotationItem;
  sectionIndex: number;
  itemIndex: number;
  groupIndex?: number;
  onUpdate: (updates: Partial<QuotationItem>) => void;
  onRemove: () => void;
  catalogItems: CatalogItem[];
  sectionCategoryId?: string;
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
        <div className="flex gap-2 items-center w-full">
          <div className="flex-1 relative w-full min-w-0">
            {/* <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10 pointer-events-none" /> */}
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
        <div className="flex items-center gap-1">
        <Input
          type="number"
          step="0.01"
          value={item.unitPrice}
          onChange={(e) => onUpdate({ unitPrice: Number(e.target.value) })}
            className="h-8 w-24 text-xs"
        />
          {item.unit && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">{item.unit}</span>
          )}
        </div>
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
  sections,
  onSectionsChange,
}: QuotationItemsAreaProps) {
  const dispatch = useAppDispatch();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [categorySearch, setCategorySearch] = useState<{ [key: number]: string }>({});
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch catalog items and categories from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingItems(true);
        const [itemsResult, categoriesResult] = await Promise.all([
          getActiveItemsForDropdown(),
          getActiveCategories(),
        ]);
        
        if (itemsResult.success) {
          // Transform items to match CatalogItem interface
          const transformedItems: CatalogItem[] = (itemsResult.items || []).map((item: {
            id: string;
            code: string;
            description: string;
            unitPrice: number;
            categories?: Array<{ category: { id: string; name: string } }>;
            unit: { id: string; symbol: string } | null;
          }) => ({
            ...item,
            categories: item.categories?.map((ic) => ic.category) || [],
          }));
          setCatalogItems(transformedItems);
        } else {
          console.error('Error fetching items:', itemsResult.error);
        }
        
        if (categoriesResult.success) {
          setCategories(categoriesResult.categories);
        } else {
          console.error('Error fetching categories:', categoriesResult.error);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchData();
  }, []);

  const generateId = () => `item-${Date.now()}-${Math.random()}`;

  const addSection = () => {
    const newSection: Section = {
      title: `Section ${sections.length + 1}`,
      sortOrder: sections.length,
      items: [],
      groups: [],
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

  const addItemToSection = (sectionIndex: number, groupId?: string) => {
    const section = sections[sectionIndex];
    const newItem: QuotationItem = {
      id: generateId(),
      sl: 1,
      unitPrice: 0,
      quantity: 1,
      amount: 0,
    };

    // Create deep copy of sections
    const updated = sections.map((s, idx) => {
      if (idx !== sectionIndex) return s;

      let updatedSection: Section;
    if (groupId) {
      // Add to group
        const groupIndex = section.groups.findIndex((g) => g.id === groupId);
      if (groupIndex !== -1) {
          const group = section.groups[groupIndex];
        const itemsInGroup = group.items.length;
        newItem.sl = itemsInGroup + 1;
          
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

  const addGroupToSection = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    const newGroup: ItemGroup = {
      id: generateId(),
      description: `Group ${section.groups.length + 1}`,
      sortOrder: section.groups.length,
      items: [],
      quantity: 0,
      isExpanded: true,
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

  const updateItem = (
    sectionIndex: number,
    itemIndex: number,
    groupIndex: number | undefined,
    updates: Partial<QuotationItem>
  ) => {
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;

      let updatedSection: Section;
    if (groupIndex !== undefined) {
        const group = s.groups[groupIndex];
        const item = group.items[itemIndex];
        const updatedItem = { ...item, ...updates };

        // Calculate amount based on dimensions
        if (
          updates.unitPrice !== undefined ||
          updates.quantity !== undefined ||
          updates.height !== undefined ||
          updates.width !== undefined ||
          updates.depth !== undefined
        ) {
          updatedItem.amount = calculateItemAmount(updatedItem);
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
    const updatedItem = { ...item, ...updates };

        // Calculate amount based on dimensions
        if (
          updates.unitPrice !== undefined ||
          updates.quantity !== undefined ||
          updates.height !== undefined ||
          updates.width !== undefined ||
          updates.depth !== undefined
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

    onSectionsChange(updated);
  };

  const removeItem = (
    sectionIndex: number,
    itemIndex: number,
    groupIndex: number | undefined
  ) => {
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;

      let updatedSection: Section;
    if (groupIndex !== undefined) {
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
      });

    onSectionsChange(updated);
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

    // Find over item
    overItemIndex = section.items.findIndex((item) => item.id === overId);
    if (overItemIndex !== -1) {
      overItem = section.items[overItemIndex];
    } else {
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
    }

    if (!activeItem || !overItem) return;

    // Same container (section or same group)
    if (
      activeGroupIndex === undefined &&
      overGroupIndex === undefined
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
    } else {
      // Moving between containers
      const updated = sections.map((s, idx) => {
        if (idx !== sectionIndex) return s;
        
      // Remove from source
        let newItems = [...s.items];
        const newGroups = s.groups.map((g) => ({ ...g, items: [...g.items] }));
        
      if (activeGroupIndex !== undefined) {
          newGroups[activeGroupIndex].items = newGroups[activeGroupIndex].items.filter(
            (_, i) => i !== activeItemIndex
        );
          newGroups[activeGroupIndex].quantity = calculateGroupQuantity(newGroups[activeGroupIndex].items);
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

  // Calculate item amount based on dimensions
  const calculateItemAmount = (item: QuotationItem): number => {
    const h = item.height;
    const w = item.width;
    const d = item.depth;
    const unitPrice = item.unitPrice || 0;
    const quantity = item.quantity || 0;

    // If height, width, and depth are all present and non-zero, use: h * w * d * unitPrice * quantity
    if (h != null && w != null && d != null && h > 0 && w > 0 && d > 0) {
      return h * w * d * unitPrice * quantity;
    }
    
    // Otherwise: unitPrice * quantity
    return unitPrice * quantity;
  };

  // Calculate group quantity as sum of all item quantities
  const calculateGroupQuantity = (items: QuotationItem[]): number => {
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  // Calculate section totals (total and grandTotal)
  const calculateSectionTotals = (section: Section) => {
    let sectionTotal = section.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    section.groups.forEach((group) => {
      sectionTotal += group.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    });
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
                      <Select
                        value={section.categoryId || 'all'}
                        onValueChange={(value) => {
                          updateSection(sectionIndex, { categoryId: value === 'all' ? undefined : value });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[180px] text-xs">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <div className="p-2">
                            <Input
                              placeholder="Search categories..."
                              value={categorySearch[sectionIndex] || ''}
                              onChange={(e) => {
                                setCategorySearch((prev) => ({
                                  ...prev,
                                  [sectionIndex]: e.target.value,
                                }));
                              }}
                              className="h-8 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <SelectItem value="all" className="text-left">All Categories</SelectItem>
                          {categories
                            .filter((category) => {
                              const search = categorySearch[sectionIndex] || '';
                              if (!search) return true;
                              return category.name.toLowerCase().includes(search.toLowerCase());
                            })
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id} className="text-left">
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                          onClick={() => addGroupToSection(sectionIndex)}
                      >
                        <FiPlus className="w-4 h-4 mr-2" />
                        Add Group
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                          onClick={() => addItemToSection(sectionIndex)}
                      >
                        <FiPlus className="w-4 h-4 mr-2" />
                        Add Item
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
                                  <div className="flex-1 grid grid-cols-3 gap-2 pb-4">
                                    <Input
                                      value={group.code || ''}
                                      onChange={(e) =>
                                        updateGroup(sectionIndex, groupIndex, {
                                          code: e.target.value,
                                        })
                                      }
                                      placeholder="Group Code"
                                      className="h-8 text-xs"
                                    />
                                    <Input
                                      value={group.description}
                                      onChange={(e) =>
                                        updateGroup(sectionIndex, groupIndex, {
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
                                          removeGroup(sectionIndex, groupIndex)
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
                                              addItemToSection(sectionIndex, group.id)
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
                                          sectionIndex={sectionIndex}
                                          itemIndex={itemIndex}
                                          groupIndex={groupIndex}
                                          catalogItems={catalogItems}
                                          sectionCategoryId={section.categoryId}
                                          onUpdate={(updates) =>
                                            updateItem(
                                              sectionIndex,
                                              itemIndex,
                                              groupIndex,
                                              updates
                                            )
                                          }
                                          onRemove={() =>
                                            removeItem(
                                              sectionIndex,
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

                        {/* Direct Section Items - Show After Groups */}
                        {section.items.length > 0 && (
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
                                {section.items.map((item, itemIndex) => (
                                  <SortableItem
                                    key={item.id}
                                    item={item}
                                    sectionIndex={sectionIndex}
                                    itemIndex={itemIndex}
                                    catalogItems={catalogItems}
                                    sectionCategoryId={section.categoryId}
                                    onUpdate={(updates) =>
                                      updateItem(
                                        sectionIndex,
                                        itemIndex,
                                        undefined,
                                        updates
                                      )
                                    }
                                    onRemove={() =>
                                      removeItem(sectionIndex, itemIndex, undefined)
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
