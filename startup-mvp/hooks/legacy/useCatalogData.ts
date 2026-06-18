'use client';

import { useState, useEffect, useRef } from 'react';
import { getActiveItemsForDropdown } from '@/app/actions/items';
import { getActiveCategories, getActiveUnits } from '@/app/(dashboard)/dashboard/items/_actions/item.action';
import { getActiveGroups } from '@/app/(dashboard)/dashboard/items/groups/_actions/group.action';

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

interface Category {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  symbol: string;
  details: string;
}

interface ModuleGroup {
  id: string;
  code: string | null;
  description: string | null;
}

interface CatalogData {
  items: CatalogItem[];
  categories: Category[];
  units: Unit[];
  moduleGroups: ModuleGroup[];
  isLoading: boolean;
  error: string | null;
}

// Singleton cache to share data across all components
let catalogCache: {
  items: CatalogItem[] | null;
  categories: Category[] | null;
  units: Unit[] | null;
  moduleGroups: ModuleGroup[] | null;
  promise: Promise<void> | null;
  timestamp: number;
} = {
  items: null,
  categories: null,
  units: null,
  moduleGroups: null,
  promise: null,
  timestamp: 0,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for fetching and caching catalog data (items, categories, units, module groups)
 * Uses a singleton cache to prevent duplicate API calls across components
 * Implements request deduplication - if multiple components mount simultaneously,
 * they all wait for the same promise instead of making separate requests
 */
export function useCatalogData(): CatalogData {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [moduleGroups, setModuleGroups] = useState<ModuleGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const fetchData = async () => {
      try {
        // Check if cache is still valid
        const now = Date.now();
        const cacheIsValid = catalogCache.timestamp > 0 && (now - catalogCache.timestamp) < CACHE_DURATION;

        if (cacheIsValid && catalogCache.items && catalogCache.categories && catalogCache.units && catalogCache.moduleGroups) {
          // Use cached data
          if (isMounted.current) {
            setItems(catalogCache.items);
            setCategories(catalogCache.categories);
            setUnits(catalogCache.units);
            setModuleGroups(catalogCache.moduleGroups);
            setIsLoading(false);
          }
          return;
        }

        // If there's already a fetch in progress, wait for it
        if (catalogCache.promise) {
          await catalogCache.promise;
          // After promise resolves, use the cached data
          if (isMounted.current && catalogCache.items && catalogCache.categories && catalogCache.units && catalogCache.moduleGroups) {
            setItems(catalogCache.items);
            setCategories(catalogCache.categories);
            setUnits(catalogCache.units);
            setModuleGroups(catalogCache.moduleGroups);
            setIsLoading(false);
          }
          return;
        }

        // Start a new fetch and store the promise for deduplication
        catalogCache.promise = (async () => {
          const [itemsResult, categoriesResult, unitsResult, moduleGroupsResult] = await Promise.all([
            getActiveItemsForDropdown(),
            getActiveCategories(),
            getActiveUnits(),
            getActiveGroups(),
          ]);

          // Transform items
          if (itemsResult.success) {
            catalogCache.items = (itemsResult.items || []).map((item: {
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
          }

          // Store categories
          if (categoriesResult.success) {
            catalogCache.categories = categoriesResult.categories;
          }

          // Store units
          if (unitsResult.success && unitsResult.units) {
            catalogCache.units = unitsResult.units;
          }

          // Store module groups
          if (moduleGroupsResult.success && moduleGroupsResult.groups) {
            catalogCache.moduleGroups = moduleGroupsResult.groups.map(g => ({
              id: g.id,
              code: g.code,
              description: g.description,
            }));
          }

          catalogCache.timestamp = Date.now();
          catalogCache.promise = null;
        })();

        await catalogCache.promise;

        // Update state with cached data
        if (isMounted.current) {
          if (catalogCache.items) setItems(catalogCache.items);
          if (catalogCache.categories) setCategories(catalogCache.categories);
          if (catalogCache.units) setUnits(catalogCache.units);
          if (catalogCache.moduleGroups) setModuleGroups(catalogCache.moduleGroups);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch catalog data');
          setIsLoading(false);
        }
        catalogCache.promise = null; // Reset promise on error
      }
    };

    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    items,
    categories,
    units,
    moduleGroups,
    isLoading,
    error,
  };
}

/**
 * Function to invalidate the catalog cache
 * Call this after creating/updating/deleting items, categories, units, or module groups
 */
export function invalidateCatalogCache() {
  catalogCache = {
    items: null,
    categories: null,
    units: null,
    moduleGroups: null,
    promise: null,
    timestamp: 0,
  };
}

