import re

with open('components/quotation/QuotationItemsArea.tsx', 'r') as f:
    content = f.read()

# We need to replace everything from "const addCustomItemToGroup = " to the end of "handleDragEnd".
# We use regex to find the start and end.
start_str = "  const addCustomItemToGroup = (sectionIndex: number, groupIndex: number) => {"
end_str = "  // Generate item code from H-W-D dimensions"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find start or end strings")
    exit(1)

new_code = """  const updateItem = (
    sectionIndex: number,
    itemIndex: number,
    groupIndex: number | undefined,
    updates: Partial<QuotationItem>
  ) => {
    // Ensure 'no' field is always a string if provided
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.no !== undefined) {
      normalizedUpdates.no = normalizedUpdates.no != null ? String(normalizedUpdates.no) : undefined;
    }
    
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;

      const item = s.items[itemIndex];
      const updatedItem = { ...item, ...normalizedUpdates };

      if (
        updates.unitPrice !== undefined ||
        updates.quantity !== undefined ||
        updates.discount !== undefined
      ) {
        updatedItem.amount = calculateItemAmount(updatedItem);
      }

      const updatedSection = {
        ...s,
        items: s.items.map((it, iIdx) => 
          iIdx === itemIndex ? updatedItem : it
        ),
      };

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
    groupIndex: number | undefined
  ) => {
    const updated = sections.map((s, sIdx) => {
      if (sIdx !== sectionIndex) return s;

      const filteredItems = s.items.filter((_, i) => i !== itemIndex);
      // Recalculate SL numbers
      const itemsWithUpdatedSl = filteredItems.map((item, i) => ({
        ...item,
        sl: i + 1,
      }));
      
      const updatedSection = {
        ...s,
        items: itemsWithUpdatedSl,
      };
      
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    });

    onSectionsChange(updated as Section[]);
  };

  const handleDragEnd = (event: DragEndEvent, sectionIndex: number) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const section = sections[sectionIndex];
    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItemIndex = section.items.findIndex((item) => item.id === activeId);
    const overItemIndex = section.items.findIndex((item) => item.id === overId);

    if (activeItemIndex === -1 || overItemIndex === -1) return;

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
      const totals = calculateSectionTotals(updatedSection);
      return {
        ...updatedSection,
        total: totals.total,
        grandTotal: totals.grandTotal,
      };
    });
    
    onSectionsChange(updated);
  };

"""

# replace
new_content = content[:start_idx] + new_code + content[end_idx:]

with open('components/quotation/QuotationItemsArea.tsx', 'w') as f:
    f.write(new_content)

print("Refactoring done")
