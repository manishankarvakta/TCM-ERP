const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app/(dashboard)/dashboard/procurements/tpn/_components/tpn-form.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
const importsToAdd = `
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { getItemVariants } from "../../../master/items/_actions/item.action";
`;
content = content.replace('import { useToast } from "@/hooks/use-toast";', 'import { useToast } from "@/hooks/use-toast";\n' + importsToAdd);

// 2. Add variantId to schema
content = content.replace('itemId: z.string().min(1, "Item is required"),', 'itemId: z.string().min(1, "Item is required"),\n    variantId: z.string().optional().nullable(),');

// 3. Add SKU modal state
const skuState = `
  // SKU selection modal state
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [skuModalItem, setSkuModalItem] = useState<{ id: string; description: string; code: string } | null>(null);
  const [skuModalIndex, setSkuModalIndex] = useState<number | null>(null);
  const [skuVariants, setSkuVariants] = useState<Array<{
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    costPrice: number | null;
  }>>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, boolean>>({});

  const handleSkuConfirm = () => {
    if (skuModalIndex === null || !skuModalItem) return;
    
    const selectedVariantIds = Object.keys(selectedVariants).filter(id => selectedVariants[id]);
    if (selectedVariantIds.length === 0) {
      setSkuModalOpen(false);
      return;
    }
    
    // Process first variant to update current row
    const firstVariantId = selectedVariantIds[0];
    const firstVariant = skuVariants.find(v => v.id === firstVariantId);
    if (firstVariant) {
      const desc = \`\${skuModalItem.code} - \${skuModalItem.description} (\${firstVariant.sku}\${firstVariant.size ? \`, \${firstVariant.size}\` : ''}\${firstVariant.color ? \`, \${firstVariant.color}\` : ''})\`;
      
      form.setValue(\`items.\${skuModalIndex}.itemId\`, skuModalItem.id);
      form.setValue(\`items.\${skuModalIndex}.variantId\`, firstVariant.id);
      form.setValue(\`items.\${skuModalIndex}.description\`, desc);
    }
    
    // Process remaining variants
    selectedVariantIds.slice(1).forEach((varId, idx) => {
      const variant = skuVariants.find(v => v.id === varId);
      if (variant) {
        const desc = \`\${skuModalItem.code} - \${skuModalItem.description} (\${variant.sku}\${variant.size ? \`, \${variant.size}\` : ''}\${variant.color ? \`, \${variant.color}\` : ''})\`;
        
        append({
          itemId: skuModalItem.id,
          variantId: variant.id,
          description: desc,
          quantity: 1,
        });
      }
    });
    
    setSkuModalOpen(false);
  };
`;
content = content.replace('const [itemSearch, setItemSearch] = useState("");\n  const searchInputRef = useRef<HTMLInputElement>(null);', 'const [itemSearch, setItemSearch] = useState("");\n  const searchInputRef = useRef<HTMLInputElement>(null);\n' + skuState);

// 4. Update fetchAllStocks to use variantId
content = content.replace('map[s.itemId] = s.quantity;', 'if (s.itemId) map[s.itemId] = s.quantity;\n             if (s.variantId) map[s.variantId] = s.quantity;');

// 5. Update createTPN payload
content = content.replace('quantity: i.quantity,', 'quantity: i.quantity,\n             variantId: i.variantId,');

// 6. Update handleItemSelect to open SKU modal if RETAIL/READY_PRODUCT
const newHandleItemSelect = `
  const handleItemSelect = async (index: number, itemId: string) => {
    const selectedItem = items.find(i => i.id === itemId);
    if (selectedItem) {
      if (selectedItem.itemType === "RETAIL" || selectedItem.itemType === "READY_PRODUCT") {
        setSkuModalItem({
          id: selectedItem.id,
          description: selectedItem.description || selectedItem.name,
          code: selectedItem.code
        });
        setSkuModalIndex(index);
        setSkuModalOpen(true);
        setSkuLoading(true);
        setSelectedVariants({});
        
        const res = await getItemVariants(selectedItem.id);
        if (res.success && res.variants) {
          setSkuVariants(res.variants);
        } else {
          toast({
            title: "Error",
            description: res.error || "Failed to load variants",
            variant: "destructive",
          });
          form.setValue(\`items.\${index}.itemId\`, "");
        }
        setSkuLoading(false);
      } else {
        form.setValue(\`items.\${index}.itemId\`, itemId);
        form.setValue(\`items.\${index}.variantId\`, null);
        form.setValue(\`items.\${index}.description\`, \`\${selectedItem.code} - \${selectedItem.description || selectedItem.name}\`);
      }
      setItemSearch("");
    }
  };
`;
content = content.replace(/const handleItemSelect = \(index: number, itemId: string\) => {[\s\S]*?setItemSearch\(""\);\n    }\n  };/, newHandleItemSelect.trim());

// 7. Update display logic for stock Map (check variantId first)
content = content.replace(
  '{stockMap[form.getValues(`items.${index}.itemId`)] || 0}',
  '{stockMap[form.getValues(`items.${index}.variantId`) || form.getValues(`items.${index}.itemId`)] || 0}'
);

// 8. Add Modal JSX to the end of component (before the final closing tag)
const skuModalJSX = `
      <Dialog open={skuModalOpen} onOpenChange={(open) => {
        if (!open) {
          setSkuModalOpen(false);
          if (skuModalIndex !== null && !form.getValues(\`items.\${skuModalIndex}.variantId\`)) {
            form.setValue(\`items.\${skuModalIndex}.itemId\`, "");
          }
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select SKUs/Variants</DialogTitle>
            <DialogDescription>
              Choose the specific SKUs for <strong>{skuModalItem?.code} - {skuModalItem?.description}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {skuLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : skuVariants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No variants/SKUs found for this product.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="w-24 px-4 py-2 text-left">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={skuVariants.length > 0 && skuVariants.every(v => !!selectedVariants[v.id])}
                            onCheckedChange={(checked) => {
                              const newSelected: Record<string, boolean> = {};
                              if (checked) {
                                skuVariants.forEach(v => {
                                  newSelected[v.id] = true;
                                });
                              }
                              setSelectedVariants(newSelected);
                            }}
                          />
                          <span>All</span>
                        </div>
                      </th>
                      <th className="px-4 py-2 text-left">SKU</th>
                      <th className="px-4 py-2 text-left">Size</th>
                      <th className="px-4 py-2 text-left">Color</th>
                      <th className="px-4 py-2 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skuVariants.map((variant) => (
                      <tr key={variant.id} className="border-t hover:bg-muted/50">
                        <td className="px-4 py-2">
                          <Checkbox
                            checked={!!selectedVariants[variant.id]}
                            onCheckedChange={(checked) => {
                              setSelectedVariants(prev => ({
                                ...prev,
                                [variant.id]: !!checked
                              }));
                            }}
                          />
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{variant.sku}</td>
                        <td className="px-4 py-2">{variant.size || "-"}</td>
                        <td className="px-4 py-2">{variant.color || "-"}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          {stockMap[variant.id] ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSkuModalOpen(false);
                if (skuModalIndex !== null && !form.getValues(\`items.\${skuModalIndex}.variantId\`)) {
                  form.setValue(\`items.\${skuModalIndex}.itemId\`, "");
                }
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSkuConfirm} disabled={skuLoading || Object.values(selectedVariants).filter(Boolean).length === 0}>
              Confirm Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
`;

content = content.replace('</form>\n  );\n}', '</form>\n' + skuModalJSX + '\n  );\n}');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated tpn-form.tsx");
