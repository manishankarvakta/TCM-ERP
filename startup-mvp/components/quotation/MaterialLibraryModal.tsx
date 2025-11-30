'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/formatters';
import { FiSearch, FiPlus } from 'react-icons/fi';
import { MATERIAL_CATEGORIES } from '@/types/enums';
import type { MaterialLibrary } from '@/types/quotation';

interface MaterialLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MaterialLibrary) => void;
}

export function MaterialLibraryModal({
  open,
  onClose,
  onSelect,
}: MaterialLibraryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [materials, setMaterials] = useState<MaterialLibrary[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch materials when modal opens
  useEffect(() => {
    if (open) {
      fetchMaterials();
    }
  }, [open]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/materials');
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = useMemo(() => {
    let filtered = materials.filter((item) => item.isActive);

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.code.toLowerCase().includes(searchLower) ||
          item.name.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [materials, categoryFilter, searchTerm]);

  const handleSelect = (item: MaterialLibrary) => {
    onSelect(item);
    onClose();
    setSearchTerm('');
    setCategoryFilter('all');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Material from Library</DialogTitle>
          <DialogDescription>
            Choose a material to autofill the form. You can edit quantity and other details after selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {MATERIAL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Materials List */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">Loading materials...</p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium mb-2">No materials found</p>
                <p className="text-sm">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredMaterials.map((item) => (
                  <Card
                    key={item.id}
                    className="hover:border-primary cursor-pointer transition-colors"
                    onClick={() => handleSelect(item)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{item.code}</Badge>
                            <Badge variant="secondary" className="capitalize">
                              {item.category}
                            </Badge>
                          </div>
                          <CardTitle className="text-base">{item.name}</CardTitle>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-primary">
                            {formatCurrency(Number(item.unitPrice))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            per {item.quantityUnit}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                      {item.specifications && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {item.specifications}
                        </p>
                      )}
                      {item.supplier && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Supplier: {item.supplier}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {!loading && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredMaterials.length} of {materials.filter((i) => i.isActive).length} materials
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

