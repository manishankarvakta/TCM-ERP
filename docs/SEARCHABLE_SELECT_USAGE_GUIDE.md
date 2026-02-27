# Searchable Select - Usage Guide

## 🎯 Quick Start

This guide shows you how to use the new `SearchableSelect` component and when to apply it to other parts of the application.

---

## 📦 Import

```tsx
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
```

---

## 🚀 Basic Example

```tsx
"use client";

import { useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";

export default function MyComponent() {
  const [value, setValue] = useState<string | null>(null);

  const options = [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Cherry", value: "cherry" },
    { label: "Date", value: "date" },
    { label: "Elderberry", value: "elderberry" },
  ];

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={setValue}
      placeholder="Select a fruit..."
      searchPlaceholder="Search fruits..."
    />
  );
}
```

---

## 🎨 With Descriptions

```tsx
const options = [
  { 
    label: "Admin", 
    value: "admin", 
    description: "Full system access" 
  },
  { 
    label: "Manager", 
    value: "manager", 
    description: "Department management" 
  },
  { 
    label: "User", 
    value: "user", 
    description: "Basic access only" 
  },
];

<SearchableSelect
  options={options}
  value={role}
  onValueChange={setRole}
  placeholder="Select a role..."
  searchPlaceholder="Search roles..."
  emptyMessage="No roles found."
/>
```

---

## 🎭 Custom Rendering

```tsx
import { Badge } from "@/components/ui/badge";

<SearchableSelect
  options={templates}
  value={templateId}
  onValueChange={setTemplateId}
  renderOption={(option) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex flex-col">
        <span className="font-medium">{option.label}</span>
        {option.description && (
          <span className="text-xs text-muted-foreground">
            {option.description}
          </span>
        )}
      </div>
      {option.value === "featured" && (
        <Badge variant="secondary">Featured</Badge>
      )}
    </div>
  )}
/>
```

---

## 📋 All Props

```typescript
interface SearchableSelectProps {
  // Required
  options: SearchableSelectOption[];
  value?: string | null;
  onValueChange: (value: string | null) => void;
  
  // Optional
  placeholder?: string;              // Default: "Select an option..."
  searchPlaceholder?: string;        // Default: "Search..."
  emptyMessage?: string;             // Default: "No results found."
  disabled?: boolean;                // Default: false
  className?: string;                // Additional CSS classes
  allowClear?: boolean;              // Default: false
  renderOption?: (option: SearchableSelectOption) => React.ReactNode;
}

interface SearchableSelectOption {
  label: string;                     // Display text
  value: string;                     // Unique identifier
  description?: string;              // Optional subtitle
  disabled?: boolean;                // Disable this option
}
```

---

## 🔍 When to Use SearchableSelect

### ✅ Use SearchableSelect When:

1. **Long Lists** (10+ options)
   - User roles/permissions
   - Categories with many items
   - Templates/presets
   - Countries/cities

2. **Searchable Data**
   - Users need to find items quickly
   - Options have similar names
   - Alphabetical lists

3. **Complex Options**
   - Options with descriptions
   - Options with metadata
   - Grouped data

### ❌ Use Regular Select When:

1. **Short Lists** (< 10 options)
   - Yes/No/Maybe
   - Status (Draft/Published/Archived)
   - Priority (Low/Medium/High)

2. **Well-Known Options**
   - Days of week
   - Months
   - Common categories

---

## 📍 Recommended Conversions

### Current Components That Could Benefit

#### 1. **User Form - Role Selector** (Low Priority)
**File:** `components/forms/user-form.tsx`
**Current:** Only 2 options (User/Admin)
**Recommendation:** ⚠️ Keep as regular Select (too few options)

```tsx
// Current implementation is fine
<Select value={role} onValueChange={setValue}>
  <SelectItem value="user">User</SelectItem>
  <SelectItem value="admin">Admin</SelectItem>
</Select>
```

#### 2. **Material Form** (Medium Priority)
**File:** `components/quotation/MaterialForm.tsx`
**Use Case:** Category selection
**Recommendation:** ✅ Convert if categories > 10

```tsx
// If many categories, convert to:
<SearchableSelect
  options={categories.map(cat => ({
    label: cat.name,
    value: cat.id,
    description: cat.description
  }))}
  value={categoryId}
  onValueChange={setCategoryId}
  placeholder="Select category..."
  searchPlaceholder="Search categories..."
/>
```

#### 3. **Interior Unit Form** (Medium Priority)
**File:** `components/quotation/InteriorUnitForm.tsx`
**Use Case:** Unit type selection
**Recommendation:** ✅ Convert if unit types > 15

#### 4. **Section Form** (Low Priority)
**File:** `components/quotation/SectionForm.tsx`
**Use Case:** Category selection
**Recommendation:** Evaluate based on category count

---

## 🎯 Real-World Examples

### Example 1: Permission Templates (Already Implemented ✅)

```tsx
// File: components/permissions/template-selector.tsx

const options: SearchableSelectOption[] = [
  {
    label: "No Template",
    value: "none",
    description: "Custom permissions",
  },
  ...templates.map((template) => ({
    label: template.name,
    value: template.id,
    description: template.description || undefined,
  })),
];

<SearchableSelect
  options={options}
  value={selectedTemplateId || "none"}
  onValueChange={handleValueChange}
  placeholder="Select a template"
  searchPlaceholder="Search templates..."
  emptyMessage="No templates found."
  renderOption={(option) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex flex-col">
        <span>{option.label}</span>
        {option.description && (
          <span className="text-xs text-muted-foreground">
            {option.description}
          </span>
        )}
      </div>
      {option.value === "none" && (
        <Badge variant="outline">Custom</Badge>
      )}
    </div>
  )}
/>
```

### Example 2: Category Selector (Potential Use)

```tsx
"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { useCategories } from "@/hooks/useCategories";

export function CategorySelector({ value, onChange }) {
  const { categories, isLoading } = useCategories();

  const options = categories.map(category => ({
    label: category.name,
    value: category.id,
    description: `${category.itemCount} items`,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder="Select category..."
      searchPlaceholder="Search categories..."
      disabled={isLoading}
    />
  );
}
```

### Example 3: User Selector (Potential Use)

```tsx
"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function UserSelector({ users, value, onChange }) {
  const options = users.map(user => ({
    label: user.name || user.email,
    value: user.id,
    description: user.email,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onChange}
      placeholder="Select user..."
      searchPlaceholder="Search users..."
      renderOption={(option) => {
        const user = users.find(u => u.id === option.value);
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user?.image} />
              <AvatarFallback>
                {option.label.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span>{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </div>
          </div>
        );
      }}
    />
  );
}
```

---

## 🔄 Migration Guide

### Converting from Regular Select

**Before:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    {items.map(item => (
      <SelectItem key={item.id} value={item.id}>
        {item.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**After:**
```tsx
import { SearchableSelect } from "@/components/ui/searchable-select";

<SearchableSelect
  options={items.map(item => ({
    label: item.name,
    value: item.id,
    description: item.description
  }))}
  value={value}
  onValueChange={setValue}
  placeholder="Select option"
  searchPlaceholder="Search..."
/>
```

---

## 🎨 Styling

### Custom Width
```tsx
<SearchableSelect
  className="w-[300px]"
  // ... other props
/>
```

### In Form Layout
```tsx
<div className="space-y-2">
  <Label htmlFor="category">Category</Label>
  <SearchableSelect
    options={categories}
    value={categoryId}
    onValueChange={setCategoryId}
    placeholder="Select category..."
  />
</div>
```

### With Error State
```tsx
<div className="space-y-2">
  <Label htmlFor="template">Template</Label>
  <SearchableSelect
    className={errors.template ? "border-destructive" : ""}
    options={templates}
    value={templateId}
    onValueChange={setTemplateId}
  />
  {errors.template && (
    <p className="text-sm text-destructive">{errors.template.message}</p>
  )}
</div>
```

---

## ⚡ Performance Tips

1. **Memoize Options**
```tsx
const options = useMemo(() => 
  items.map(item => ({
    label: item.name,
    value: item.id
  })),
  [items]
);
```

2. **Lazy Load Data**
```tsx
const { data: items, isLoading } = useQuery(['items'], fetchItems);

<SearchableSelect
  options={items || []}
  disabled={isLoading}
  // ... other props
/>
```

3. **Debounce for Large Lists**
```tsx
// For 1000+ items, consider server-side search
const [searchQuery, setSearchQuery] = useState("");
const debouncedSearch = useDebounce(searchQuery, 300);

// Fetch filtered results from server
const { data } = useQuery(
  ['items', debouncedSearch],
  () => fetchItems(debouncedSearch)
);
```

---

## 🐛 Troubleshooting

### Issue: Options not filtering
**Solution:** Make sure `shouldFilter={false}` is set on Command component (already configured)

### Issue: Dropdown not closing on select
**Solution:** Ensure `setOpen(false)` is called in `handleSelect` (already implemented)

### Issue: Search not clearing
**Solution:** Reset search query when dropdown closes:
```tsx
<Popover 
  open={open} 
  onOpenChange={(isOpen) => {
    setOpen(isOpen);
    if (!isOpen) setSearchQuery("");
  }}
>
```

---

## 📚 Related Components

- **MultiSelect** - For multiple selections with search
- **Combobox** - Alternative implementation (not used in this project)
- **Command** - Base component for search functionality
- **Select** - Basic select without search

---

## 🎯 Summary

The `SearchableSelect` component provides:
- ✅ Built-in search functionality
- ✅ Keyboard navigation
- ✅ Accessible design
- ✅ Flexible rendering
- ✅ Consistent UX
- ✅ Easy migration from regular Select

Use it whenever you have 10+ options or when users need to quickly find specific items.

---

**Questions?** Check the full documentation in `startup-mvp/docs/SELECT_UI_IMPROVEMENTS.md`

