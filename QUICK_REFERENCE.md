# 🚀 Quick Reference: Searchable Select

## 📦 Import
```tsx
import { SearchableSelect } from "@/components/ui/searchable-select";
```

## ⚡ Basic Usage
```tsx
<SearchableSelect
  options={[
    { label: "Option 1", value: "1" },
    { label: "Option 2", value: "2" },
  ]}
  value={value}
  onValueChange={setValue}
  placeholder="Select..."
  searchPlaceholder="Search..."
/>
```

## 🎨 With Descriptions
```tsx
options={[
  { 
    label: "Admin", 
    value: "admin", 
    description: "Full access" 
  },
]}
```

## 🎭 Custom Render
```tsx
<SearchableSelect
  renderOption={(opt) => (
    <div>
      <strong>{opt.label}</strong>
      <p>{opt.description}</p>
    </div>
  )}
/>
```

## 📋 Props
| Prop | Type | Required | Default |
|------|------|----------|---------|
| `options` | `SearchableSelectOption[]` | ✅ Yes | - |
| `value` | `string \| null` | ✅ Yes | - |
| `onValueChange` | `(value: string \| null) => void` | ✅ Yes | - |
| `placeholder` | `string` | No | "Select an option..." |
| `searchPlaceholder` | `string` | No | "Search..." |
| `emptyMessage` | `string` | No | "No results found." |
| `disabled` | `boolean` | No | `false` |
| `className` | `string` | No | - |
| `allowClear` | `boolean` | No | `false` |
| `renderOption` | `function` | No | - |

## ✅ When to Use
- ✅ Lists with 10+ options
- ✅ Need quick search
- ✅ Complex options with descriptions
- ✅ Keyboard navigation important

## ❌ When NOT to Use
- ❌ Less than 10 options
- ❌ Simple Yes/No choices
- ❌ Well-known options (days, months)

## 🎯 Already Implemented
1. ✅ Permission Template Selector
2. ✅ Multi-Select Component (with search)

## 📚 Full Docs
- `startup-mvp/docs/SELECT_UI_IMPROVEMENTS.md`
- `SEARCHABLE_SELECT_USAGE_GUIDE.md`
- `BEFORE_AFTER_COMPARISON.md`

## 🐛 Troubleshooting
**Not filtering?** → Check `shouldFilter={false}` on Command
**Not closing?** → Ensure `setOpen(false)` in handleSelect
**Search not clearing?** → Reset on dropdown close

## 💡 Pro Tips
1. Memoize options for performance
2. Use descriptions for clarity
3. Custom render for complex UI
4. Disable during loading states

---

**Questions?** Check the full documentation or ask the team! 🎉

