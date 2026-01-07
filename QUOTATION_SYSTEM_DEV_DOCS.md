# Quotation System - Development Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [Components](#components)
5. [Server Actions](#server-actions)
6. [Calculations & Formulas](#calculations--formulas)
7. [State Management](#state-management)
8. [Performance Optimizations](#performance-optimizations)
9. [Common Workflows](#common-workflows)
10. [Development Guidelines](#development-guidelines)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Quotation System is a comprehensive solution for creating, managing, and tracking project quotations. It supports complex nested structures with sections, groups, and items, including automated calculations, module groups, and custom items.

### Key Features
- ✅ Multi-level structure: Sections → Groups → Items
- ✅ Module Groups (templates for kitchen modules)
- ✅ Custom items with dimension-based pricing
- ✅ Automated calculations (unit price, totals, grand totals)
- ✅ Drag-and-drop reordering
- ✅ Category-based grouping
- ✅ Client and organization management
- ✅ Status tracking and workflow
- ✅ PDF export
- ✅ Revision history
- ✅ Role-based access control

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **State Management**: Redux Toolkit
- **Forms**: React Hook Form + Zod
- **Database**: PostgreSQL via Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui
- **Drag & Drop**: dnd-kit
- **PDF**: Custom PDF generator

---

## Architecture

### Application Structure

```
startup-mvp/
├── app/
│   ├── (dashboard)/
│   │   ├── admin/quotations/          # Admin routes
│   │   │   ├── page.tsx               # List view
│   │   │   ├── new/page.tsx           # Create form
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx           # Detail view
│   │   │   │   └── edit/
│   │   │   │       ├── page.tsx       # Server component (loads data)
│   │   │   │       └── EditQuotationForm.tsx  # Client component
│   │   └── dashboard/quotations/      # Dashboard routes (same structure)
│   └── actions/
│       ├── quotations.ts              # CRUD operations
│       └── quotation-helpers.ts       # Helper functions
├── components/
│   ├── quotation/
│   │   ├── QuotationFormV3.tsx        # Main form component
│   │   ├── QuotationItemsArea.tsx     # Items management (2651 lines)
│   │   ├── QuotationBasicInfoCard.tsx # Summary card
│   │   ├── ProjectInfoSection.tsx     # Project details
│   │   ├── ClientInformationSection.tsx
│   │   └── SubmissionInformationSection.tsx
│   └── common/
│       └── ErrorBoundary.tsx          # Error handling
├── lib/
│   ├── redux/
│   │   ├── slices/quotationSlice.ts   # Redux state
│   │   └── hooks.ts
│   └── utils/
│       └── calculations.ts            # Kitchen module calculations
├── hooks/
│   └── useCatalogData.ts              # Cached data fetching
└── prisma/
    └── schema.prisma                  # Database schema
```

### Component Hierarchy

```
QuotationFormV3 (Main container)
├── ErrorBoundary
├── QuotationBasicInfoCard (Summary)
├── ProjectInfoSection
├── ClientInformationSection
├── SubmissionInformationSection
└── QuotationItemsArea (Core functionality)
    ├── Section (Accordion)
    │   ├── Group (Sortable)
    │   │   ├── GroupHeader
    │   │   ├── Item (Sortable)
    │   │   │   ├── ItemFields (dimensions, prices)
    │   │   │   └── ItemActions (delete, duplicate)
    │   │   └── AddItemButton
    │   ├── CategoryGroup
    │   │   └── Items (by category)
    │   └── AddGroupButton
    └── AddSectionButton
```

---

## Data Models

### Prisma Schema (Simplified)

```prisma
model Quotation {
  id                  String   @id @default(cuid())
  quotationNumber     String   @unique
  subject             String
  date                DateTime
  status              QuotationStatus @default(DRAFT)
  total               Decimal  @default(0)
  discount            Decimal?
  shippingCharges     Decimal?
  vatIncluded         Boolean  @default(false)
  projectLocation     String?
  coverLetter         String?
  financialStatement  String?
  tos                 String?
  isTrash             Boolean  @default(false)
  
  clientId            String
  client              Client   @relation(...)
  organizationId      String?
  organization        Organization?
  submittedById       String
  submittedBy         User     @relation(...)
  
  section             Section[]
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model Section {
  id              String   @id @default(cuid())
  title           String
  note            String?
  discount        Decimal?
  total           Decimal?
  grandTotal      Decimal?
  sortOrder       Int      @default(0)
  categoryId      String?
  
  quotationId     String
  quotation       Quotation @relation(...)
  preparedById    String
  preparedBy      User      @relation(...)
  
  groups          Group[]
  items           QuotationItem[]
  categoryGroups  CategoryGroup[]
}

model Group {
  id              String   @id @default(cuid())
  code            String?
  description     String
  quantity        Decimal?
  number          Int?
  sortOrder       Int      @default(0)
  moduleGroupId   String?  // Reference to ModuleGroup template
  baseUnit        String?  // sqft, sqm, sqin
  baseUnitPrice   Decimal? // Cost per base unit
  
  sectionId       String
  section         Section  @relation(...)
  items           GroupItem[]
}

model GroupItem {
  id                  String   @id @default(cuid())
  sl                  Int      // Serial number
  no                  String?  // Item number
  code                String?
  description         String?
  height              Decimal?
  width               Decimal?
  depth               Decimal?
  unit                String?
  unitPrice           Decimal
  quantity            Decimal
  unitShutter         Decimal?
  totalShutter        Decimal?
  discount            Decimal?
  amount              Decimal
  sortOrder           Int      @default(0)
  
  groupId             String
  group               Group    @relation(...)
  itemId              String?  // Reference to catalog Item
  item                Item?
  moduleGroupItemId   String?  // Reference to ModuleGroupItem template
}

model ModuleGroup {
  id              String   @id @default(cuid())
  code            String?
  description     String?
  baseUnit        String?  // sqft, sqm, sqin
  baseUnitPrice   Decimal? // Cost per base unit
  
  items           ModuleGroupItem[]
}

model ModuleGroupItem {
  id              String   @id @default(cuid())
  sl              Int
  code            String?
  description     String?
  unit            String?
  
  moduleGroupId   String
  moduleGroup     ModuleGroup @relation(...)
  itemId          String?
  item            Item?
}
```

### Type Definitions

```typescript
// QuotationItemsArea.tsx types
interface QuotationItem {
  id: string;
  sl: number;
  no?: string | null;
  code?: string | null;
  description?: string | null;
  height?: number | null;
  width?: number | null;
  depth?: number | null;
  unit?: string | null;
  unitPrice: number;
  quantity: number;
  unitShutter?: number | null;
  totalShutter?: number | null;
  discount?: number | null;
  amount: number;
  sortOrder: number;
  itemId?: string | null;
  moduleGroupItemId?: string | null;
  isCustomItem?: boolean; // Flag for custom items
}

interface Group {
  id: string;
  code?: string | null;
  description: string;
  quantity?: number | null;
  sortOrder: number;
  items: QuotationItem[];
  isExpanded?: boolean;
  moduleGroupId?: string | null;
  baseUnit?: string | null;
  baseUnitPrice?: number | null;
}

interface CategoryGroup {
  id: string;
  categoryId?: string;
  sortOrder: number;
  items: QuotationItem[];
}

interface Section {
  id: string;
  title: string;
  note?: string | null;
  discount?: number | null;
  total?: number | null;
  grandTotal?: number | null;
  sortOrder: number;
  categoryId?: string;
  items: QuotationItem[];
  groups: Group[];
  categoryGroups: CategoryGroup[];
}
```

---

## Components

### 1. QuotationFormV3

**Path**: `components/quotation/QuotationFormV3.tsx`

**Purpose**: Main form container managing the entire quotation creation/edit process.

**Key Responsibilities**:
- Form state management (React Hook Form + Zod)
- Redux state synchronization
- Data initialization (user, TOS, organizations)
- Form submission handling
- Grand total calculation

**Key Features**:
- Debounced Redux sync (300ms)
- Circuit breaker (max 10 updates/second)
- Initialization guard (`hasLoadedDataRef`)
- Error boundaries integration
- Stable function references (`useCallback`)

**Important Refs**:
```typescript
const hasLoadedDataRef = useRef(false);        // Prevent repeated data loading
const isLoadingDataRef = useRef(false);        // Skip Redux sync during init
const isSubmittingRef = useRef(false);         // Prevent duplicate submissions
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
const updateCountRef = useRef(0);              // Circuit breaker counter
```

**Key Methods**:
- `loadQuotationData()`: Fetches user, TOS, organizations
- `onFormSubmit()`: Prepares and submits quotation data
- `handleSaveDraft()`: Saves as draft status
- `collectChangedFields()`: Detects actual value changes for Redux

---

### 2. QuotationItemsArea

**Path**: `components/quotation/QuotationItemsArea.tsx` (2651 lines)

**Purpose**: Manages sections, groups, and items with drag-and-drop, calculations, and complex interactions.

**Key Responsibilities**:
- CRUD operations for sections, groups, items
- Drag-and-drop reordering (dnd-kit)
- Automated calculations
- Module group integration
- Custom item price calculation
- Category grouping

**Key Features**:
- Cached catalog data (`useCatalogData` hook)
- Optimized recalculations (debounced, ref-guarded)
- Module group items loading
- baseUnitPrice-based pricing for custom items
- Memoized components (`React.memo`)

**Important State**:
```typescript
const [sections, setSections] = useState<Section[]>([]);
const [catalogItems, categories, units, moduleGroups] = useCatalogData();
const [moduleGroupItems, setModuleGroupItems] = useState<Record<string, QuotationItem[]>>({});
```

**Key Methods**:
- `addSection()`: Creates new section
- `addGroup()`: Creates new group in section
- `addItem()`: Adds item to group/section/category group
- `updateItem()`: Updates item properties, recalculates prices
- `removeItem()`: Deletes item
- `calculateItemAmount()`: Computes item amount (unitPrice × quantity - discount)
- `calculateSectionTotals()`: Sums all items in section
- `calculateGroupQuantity()`: Calculates group quantity for module groups
- `calculateKitchenModule()`: Dimension-based pricing calculation

---

### 3. QuotationBasicInfoCard

**Path**: `components/quotation/QuotationBasicInfoCard.tsx`

**Purpose**: Displays summary information (quotation number, date, client, total).

**Features**:
- Real-time total updates
- Status display
- Client information
- Organization details

---

### 4. Other Components

**ProjectInfoSection**: Project location, additional details  
**ClientInformationSection**: Client selection/creation  
**SubmissionInformationSection**: Submitted by, date, status

---

## Server Actions

### Location
`app/actions/quotations.ts` (1479 lines)

### Actions Overview

#### 1. `getQuotations(page, limit, search, status)`
**Purpose**: Fetches paginated list of quotations with filtering.

**Features**:
- Pagination
- Search (quotation number, subject, client name/company)
- Status filtering
- Role-based access (users see only their quotations + subordinates)
- Trash filtering

**Returns**:
```typescript
{
  success: boolean;
  quotations: Quotation[];
  pagination: { page, limit, total, totalPages };
  error?: string;
}
```

---

#### 2. `getQuotation(id)`
**Purpose**: Fetches single quotation with all related data.

**Includes**:
- Client, Organization, User info
- All sections with groups and items
- Category groups
- Nested items with catalog references

**Returns**:
```typescript
{
  success: boolean;
  data: Quotation | null;
  error?: string;
}
```

---

#### 3. `createQuotation(data)`
**Purpose**: Creates new quotation with nested structures.

**Process**:
1. Validates user session
2. Creates/updates client
3. Fetches TOS and cover letter from settings
4. Fetches `baseUnit`/`baseUnitPrice` from ModuleGroups
5. Enriches sections with module group data
6. Calculates totals
7. Creates quotation with nested sections, groups, items
8. Revalidates cache paths
9. Creates user log and notifications

**Key Features**:
- Parallel data fetching (`Promise.all`)
- Client auto-creation if email provided
- Module group enrichment
- Optimized total calculation (single pass)

**Returns**:
```typescript
{
  success: boolean;
  data: Quotation | null;
  error?: string;
}
```

---

#### 4. `updateQuotation(id, data)`
**Purpose**: Updates existing quotation.

**Process**:
1. Validates user session
2. Fetches current quotation
3. Updates/creates client
4. Fetches TOS, cover letter, module group data (parallel)
5. Enriches sections
6. Deletes existing sections
7. Creates new sections with updated data
8. Updates quotation record
9. Revalidates cache
10. Creates logs and notifications

**Important**: Uses full replacement strategy (delete + recreate) for sections to avoid complex nested updates.

---

#### 5. `deleteQuotation(id)` / `bulkUpdateQuotationStatus(...)`
**Purpose**: Soft delete (move to trash) or bulk status updates.

---

### Helper Functions

**Location**: `app/actions/quotation-helpers.ts`

- `getQuotationUser()`: Gets current user for quotation
- `getTOSContent()`: Fetches Terms of Service
- `getCoverLetterContent()`: Fetches cover letter template
- `revalidateBothPaths()`: Cache invalidation for both routes

---

## Calculations & Formulas

### 1. Item Amount Calculation

```typescript
const calculateItemAmount = (item: QuotationItem): number => {
  const unitPrice = item.unitPrice || 0;
  const quantity = item.quantity || 0;
  const discount = item.discount || 0;
  
  const subtotal = unitPrice * quantity;
  const amount = subtotal - discount;
  
  return Math.max(0, amount); // Never negative
};
```

---

### 2. Section Totals

```typescript
const calculateSectionTotals = (section: Section) => {
  let total = 0;
  
  // Sum all items in section
  section.items.forEach(item => {
    total += item.amount || 0;
  });
  
  // Sum all items in groups
  section.groups.forEach(group => {
    group.items.forEach(item => {
      total += item.amount || 0;
    });
  });
  
  // Sum all items in category groups
  section.categoryGroups.forEach(categoryGroup => {
    categoryGroup.items.forEach(item => {
      total += item.amount || 0;
    });
  });
  
  const sectionDiscount = section.discount || 0;
  const grandTotal = total - sectionDiscount;
  
  return { total, grandTotal };
};
```

---

### 3. Kitchen Module Calculation (Dimension-Based Pricing)

**Location**: `lib/utils/calculations.ts` - `calculateKitchenModule()`

**Purpose**: Calculates unit price based on dimensions and base unit price.

**Formula**:
```typescript
// For custom items in groups with baseUnitPrice:

1. Convert dimensions to inches (if in feet)
2. Calculate area based on baseUnit:
   - For 'sqft': area = (width * height) / 144
   - For 'sqm': area = (width * height) / 1550
   - For 'sqin': area = (width * height)
   
3. Calculate cost:
   unitPrice = area * baseUnitPrice
   
4. Handle special cases:
   - Corner units (depth affects calculation)
   - Shelves (additional cost)
   - Shutters (unit shutters affect price)
```

**Example**:
```typescript
// Group has:
baseUnit: "sqft"
baseUnitPrice: 50.00  // $50 per square foot

// Custom item:
height: 36 inches
width: 24 inches  
depth: 12 inches

// Calculation:
area = (24 * 36) / 144 = 6 sqft
unitPrice = 6 * 50 = $300
```

---

### 4. Group Quantity Calculation

For module groups, quantity is calculated based on group items:

```typescript
const calculateGroupQuantity = (group: Group): number => {
  if (!group.items || group.items.length === 0) return 0;
  
  // Sum all item quantities
  return group.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
};
```

---

### 5. Grand Total

```typescript
const calculateGrandTotal = (sections: Section[]): number => {
  return sections.reduce((total, section) => {
    return total + (section.grandTotal || section.total || 0);
  }, 0);
};
```

---

## State Management

### Redux Store

**Location**: `lib/redux/slices/quotationSlice.ts`

**State Structure**:
```typescript
interface QuotationState {
  currentQuotation: Quotation | null;
  isEditing: boolean;
}
```

**Key Actions**:
- `setCurrentQuotation(quotation)`: Sets entire quotation
- `updateQuotationField({ field, value })`: Updates single field
- `updateSections(sections)`: Updates sections array
- `addItem(item)`: Adds item to sections
- `updateItem({ sectionIndex, groupIndex, itemIndex, updates })`: Updates specific item
- `removeItem({ sectionIndex, groupIndex, itemIndex })`: Removes item
- `updateSectionNote({ sectionIndex, note })`: Updates section note
- `updateSectionDiscount({ sectionIndex, discount })`: Updates section discount
- `calculateGrandTotal()`: Recalculates total

**Helper Functions**:
- `recalculateSectionTotals(section)`: Computes section totals
- `areSectionsEqual(a, b)`: Deep equality check to prevent unnecessary updates

---

## Performance Optimizations

### 1. Cached Data Fetching

**Hook**: `hooks/useCatalogData.ts`

**Purpose**: Centralized caching for catalog data (items, categories, units, module groups).

**Features**:
- Single fetch on mount
- Shared across components
- Request deduplication
- 5-minute cache duration

**Usage**:
```typescript
const { catalogItems, categories, units, moduleGroups, isLoading } = useCatalogData();
```

---

### 2. Debounced Redux Sync

**Location**: `QuotationFormV3.tsx`

**Strategy**:
- 300ms debounce on form value changes
- Only dispatches if values actually changed
- Circuit breaker (max 10 updates/second)
- Skip sync during initialization

**Benefits**:
- Reduces re-renders
- Prevents blocking UI on every keystroke
- Avoids infinite loops

---

### 3. Memoization

**Components**:
- `SortableItem` wrapped with `React.memo`
- `useMemo` for expensive calculations
- `useCallback` for stable function references

**Example**:
```typescript
const SortableItem = React.memo(({ item, onUpdate, onRemove }) => {
  // Only re-renders if item/handlers change
});

const grandTotal = useMemo(() => {
  return sections.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
}, [sections]);
```

---

### 4. Optimized Calculations

**Strategy**:
- Debounced recalculations (500ms)
- Ref-guarded useEffect (only run when baseUnit/baseUnitPrice change)
- Single-pass iteration (avoid nested loops)
- `startTransition` for non-urgent updates

---

### 5. Error Boundaries

**Component**: `components/common/ErrorBoundary.tsx`

**Usage**:
```tsx
<ErrorBoundary>
  <QuotationFormV3 onSubmit={handleSubmit} />
</ErrorBoundary>
```

**Benefits**:
- Prevents app crashes
- User-friendly error messages
- Reset functionality
- Development mode error details

---

## Common Workflows

### 1. Create New Quotation

```
User → /admin/quotations/new
  ↓
QuotationFormV3 loads
  ↓
loadQuotationData() fetches user, TOS, organizations
  ↓
User fills form:
  - Basic info (quotation number, subject, date)
  - Client info
  - Project location
  ↓
QuotationItemsArea:
  - Add sections
  - Add groups (from ModuleGroup templates)
  - Add items (from catalog or custom)
  - Calculations run automatically
  ↓
User clicks Submit
  ↓
createQuotation() server action:
  - Validates data
  - Creates/updates client
  - Fetches module group data
  - Enriches sections with baseUnit/baseUnitPrice
  - Calculates totals
  - Creates database records
  - Revalidates cache
  - Creates logs/notifications
  ↓
Redirect to quotation detail page
```

---

### 2. Edit Existing Quotation

```
User → /admin/quotations/[id]/edit
  ↓
Server component (page.tsx):
  - Calls getQuotation(id)
  - Transforms data to form format
  - Includes baseUnit/baseUnitPrice for groups ✅
  ↓
EditQuotationForm client component:
  - Receives initialData
  - Passes to QuotationFormV3
  ↓
QuotationFormV3 initializes:
  - Sets form values from initialData
  - Loads additional data (user, TOS)
  - Skips Redux sync during initialization
  ↓
User edits:
  - Changes to form trigger recalculations
  - Custom items with dimensions recalculate unitPrice
  - Section totals update automatically
  ↓
User clicks Submit
  ↓
updateQuotation(id, data) server action:
  - Similar to createQuotation
  - Deletes existing sections
  - Creates new sections with updated data
  - Updates quotation record
  ↓
Redirect to detail page
```

---

### 3. Add Custom Item to Group

```
User clicks "Add Item" in a group
  ↓
Modal/form appears
  ↓
User enters:
  - Description
  - Dimensions (height, width, depth)
  - Unit (optional)
  - Quantity
  ↓
System checks:
  - Is group from ModuleGroup?
  - Does group have baseUnit and baseUnitPrice?
  ↓
If YES (custom item pricing):
  - Calls calculateKitchenModule()
  - Inputs: dimensions, baseUnit, baseUnitPrice
  - Calculates area
  - Computes unitPrice = area × baseUnitPrice
  - Sets calculated unitPrice
  ↓
If NO (manual pricing):
  - User enters unitPrice manually
  ↓
Item added to group
  ↓
Calculations cascade:
  - Item amount = unitPrice × quantity - discount
  - Group total updates
  - Section total updates
  - Grand total updates
  ↓
Redux state updates
```

---

### 4. Drag & Drop Reordering

```
User drags item/group/section
  ↓
DndContext detects drag start
  ↓
onDragEnd handler:
  - Identifies source and destination
  - Validates drop (same parent for items)
  - Updates sortOrder for affected items
  ↓
Deep copy of sections created
  ↓
Array reordering (splice + insert)
  ↓
sortOrder recalculated for all items in container
  ↓
onSectionsChange(updatedSections)
  ↓
Parent component updates state
  ↓
Redux syncs
  ↓
Form marks as dirty
```

---

## Development Guidelines

### 1. Code Organization

**File Size**: Keep components under 1000 lines. If larger, consider:
- Extracting sub-components
- Creating custom hooks
- Moving logic to utilities

**Example**: `QuotationItemsArea` (2651 lines) could be split into:
- `SectionManager`
- `GroupManager`
- `ItemManager`
- `CalculationEngine`

---

### 2. State Management Rules

**Local vs Redux**:
- **Local State**: UI-only state (modals, accordions, loading)
- **Redux State**: Form data, shared across components

**Sync Strategy**:
- Debounce updates (300ms minimum)
- Check for actual changes before dispatching
- Use `startTransition` for non-urgent updates
- Guard against infinite loops (circuit breakers)

---

### 3. Performance Checklist

When adding new features:

- [ ] Is data fetching necessary or can it be cached?
- [ ] Are functions stable (`useCallback`)?
- [ ] Are expensive calculations memoized (`useMemo`)?
- [ ] Are components memoized if they re-render frequently (`React.memo`)?
- [ ] Is the component listening to only necessary Redux state?
- [ ] Are `useEffect` dependencies minimal and stable?
- [ ] Is debouncing used for rapid updates (typing, calculations)?

---

### 4. Testing Guidelines

**Manual Testing Checklist**:

**Create**:
- [ ] Create quotation with sections, groups, items
- [ ] Add module group, verify baseUnit/baseUnitPrice loaded
- [ ] Add custom item with dimensions, verify unitPrice calculated
- [ ] Verify totals calculate correctly
- [ ] Submit and verify saved correctly

**Edit**:
- [ ] Load existing quotation, verify all data displayed
- [ ] Verify custom items show correct unitPrice
- [ ] Change dimensions, verify unitPrice recalculates
- [ ] Add/remove items, verify totals update
- [ ] Submit and verify updates saved

**Performance**:
- [ ] Check console for render counts (should stabilize after load)
- [ ] Type in form fields, verify no lag
- [ ] Check Network tab, verify no duplicate API calls
- [ ] Drag and drop items, verify smooth operation

---

### 5. Common Pitfalls

#### Pitfall 1: Infinite Loops

**Symptom**: Component renders continuously, console flooded with logs.

**Causes**:
- Unstable `useEffect` dependencies (objects/arrays recreated every render)
- Redux dispatch triggers re-render which triggers dispatch again
- Form `setValue` triggering watchers which trigger `setValue`

**Solutions**:
- Use `useRef` to track previous values
- Implement circuit breakers
- Add guards to skip unnecessary updates
- Use `useMemo` for stable object/array references

#### Pitfall 2: Missing baseUnitPrice in Edit

**Symptom**: Custom items don't calculate unitPrice when editing.

**Cause**: Edit page not including `baseUnit`/`baseUnitPrice` when mapping data.

**Solution**: Always include these fields:
```typescript
groups: section.groups?.map((group: any) => ({
  ...
  baseUnit: group.baseUnit || null,
  baseUnitPrice: group.baseUnitPrice ? Number(group.baseUnitPrice) : null,
  ...
}))
```

#### Pitfall 3: Decimal Type Issues

**Symptom**: TypeScript errors with Prisma Decimal types.

**Cause**: Prisma returns `Decimal` objects, but TypeScript expects `number`.

**Solution**: Convert to number:
```typescript
unitPrice: Number(item.unitPrice)
```

#### Pitfall 4: Form State Sync Issues

**Symptom**: Form shows old values after navigation, or values don't update.

**Cause**: React Hook Form not resetting or Redux state out of sync.

**Solution**:
- Call `reset(initialData)` when initialData changes
- Ensure Redux sync is working correctly
- Use `watch()` to monitor form values

---

## Troubleshooting

### Issue 1: Infinite POST Requests

**Symptom**: Network tab shows rapid repeated POST requests.

**Diagnosis**:
1. Check console logs for repeated renders
2. Look for "loadQuotationData" called multiple times
3. Check if `hasLoadedDataRef` guard is in place

**Fix**:
- Add initialization guard (`hasLoadedDataRef`)
- Ensure `useCallback` for `handleSubmit`
- Verify no unstable dependencies in `useEffect`

**Reference**: `INFINITE_RENDER_FIX.md`

---

### Issue 2: Input Lag/Delay

**Symptom**: Typing feels sluggish, characters appear after delay.

**Diagnosis**:
1. Check render count (should not increase on every keystroke)
2. Look for Redux dispatches on every change
3. Check for long-running calculations in render

**Fix**:
- Add debouncing (300ms)
- Skip Redux sync when no actual changes
- Use `startTransition` for non-urgent updates
- Disable Redux sync during initialization

**Reference**: `POST_LOAD_RENDER_FIX.md`

---

### Issue 3: Custom Item Prices Not Calculating

**Symptom**: Custom items in groups show $0 or incorrect prices.

**Diagnosis**:
1. Check if group has `baseUnit` and `baseUnitPrice`
2. Console log the values
3. Check if calculation logic is running

**Fix**:
- Ensure edit page includes `baseUnit`/`baseUnitPrice`
- Verify calculation guards allow execution
- Check dimensions are numbers, not strings
- Ensure `calculateKitchenModule` is being called

**Reference**: `GROUP_BASEUNITPRICE_FIX.md`

---

### Issue 4: Drag & Drop Not Working

**Symptom**: Items don't reorder when dragged.

**Diagnosis**:
1. Check if items have unique `id` property
2. Verify DndContext is wrapping components
3. Check console for dnd-kit errors

**Fix**:
- Ensure all items have stable IDs (use `ensureIds()` function)
- Verify `useSortable` hook is used correctly
- Check `onDragEnd` handler is updating state

---

### Issue 5: Totals Not Updating

**Symptom**: Section/grand totals don't reflect item changes.

**Diagnosis**:
1. Check if `calculateSectionTotals` is being called
2. Verify Redux `updateSections` action is working
3. Check if calculations are debounced too much

**Fix**:
- Ensure `onSectionsChange` is called after item updates
- Verify Redux `recalculateSectionTotals` is working
- Check if calculation guards are too restrictive

---

## Debug Tools

### 1. Console Logs

Development mode includes extensive logging:

```typescript
// Component renders
console.log('[ComponentName] Render #N');

// Data loading
console.log('[QuotationFormV3] Starting loadQuotationData...');

// Redux sync
console.log('[QuotationFormV3] Redux sync useEffect triggered');
console.log('[QuotationFormV3] Changes detected:', fields);

// Calculations
console.log('[QuotationItemsArea] Recalculating item with baseUnit:', baseUnit);
```

**To enable**: Logs are automatic in `NODE_ENV=development`.

---

### 2. Redux DevTools

**Install**: Redux DevTools browser extension

**Features**:
- View current state
- Track actions dispatched
- Time-travel debugging
- Export/import state

**Usage**: Open DevTools → Redux tab

---

### 3. React DevTools

**Install**: React DevTools browser extension

**Features**:
- Inspect component hierarchy
- View props and state
- Track re-renders (highlight updates)
- Profile performance

**Usage**: Open DevTools → Components/Profiler tab

---

## Migration Notes

### v1 → v2 (Added baseUnitPrice to Group)

**Date**: January 6, 2026

**Migration**: `20260106013626_move_baseunitprice_to_group_level`

**Changes**:
- Added `baseUnit` field to `Group` table
- Added `baseUnitPrice` field to `Group` table
- These were previously only in `ModuleGroup`

**Impact**:
- Groups now store their own `baseUnit`/`baseUnitPrice`
- Custom item calculations use group values, not ModuleGroup
- Edit pages must include these fields when loading data

**Backward Compatibility**:
- Old quotations: `baseUnit`/`baseUnitPrice` may be null
- System falls back to fetching from ModuleGroup if null
- Recalculation triggers when these values become available

---

## Future Enhancements

### Planned Features
1. **Virtual Scrolling**: For quotations with 50+ items
2. **Component Splitting**: Break `QuotationItemsArea` into smaller pieces
3. **Real-time Collaboration**: Multiple users editing same quotation
4. **Version History**: Track all changes, ability to revert
5. **Templates**: Save quotations as templates for reuse
6. **Advanced PDF**: More customization options
7. **Email Integration**: Send quotations directly to clients
8. **Analytics**: Dashboard showing quotation metrics

### Performance Targets
- Initial load: < 2 seconds
- Input lag: < 50ms
- Re-renders after load: < 5
- API calls per page: < 3

---

## Support & Resources

### Documentation Files
- `INFINITE_RENDER_FIX.md`: Infinite render loop fixes
- `POST_LOAD_RENDER_FIX.md`: Post-load rendering issues
- `GROUP_BASEUNITPRICE_FIX.md`: Custom item pricing fixes
- `QUOTATION_OPTIMIZATION_SUMMARY.md`: Performance optimizations

### Key Files
- `components/quotation/QuotationFormV3.tsx`: Main form
- `components/quotation/QuotationItemsArea.tsx`: Core logic
- `app/actions/quotations.ts`: Server actions
- `lib/redux/slices/quotationSlice.ts`: State management
- `hooks/useCatalogData.ts`: Data caching

### Architecture Decisions
- **Why Redux?**: Needed for complex form with nested data shared across components
- **Why React Hook Form?**: Best performance for large forms, excellent validation
- **Why dnd-kit?**: Modern, accessible, good TypeScript support
- **Why full replacement on update?**: Simpler than complex nested updates, acceptable for quotation use case

---

## Changelog

### 2026-01-07
- ✅ Fixed infinite render loops
- ✅ Fixed post-load rendering issues
- ✅ Fixed baseUnitPrice in edit mode
- ✅ Added comprehensive logging
- ✅ Optimized Redux sync

### 2026-01-06
- ✅ Migrated baseUnitPrice to Group level
- ✅ Added caching layer for catalog data
- ✅ Implemented circuit breakers

### Earlier
- Initial quotation system implementation
- Module groups support
- Custom item calculations
- PDF export

---

**Last Updated**: January 7, 2026  
**Version**: 3.0  
**Maintainer**: Development Team

