'use server';

import { getActiveItems } from '@/app/(dashboard)/dashboard/master/items/_actions/item.action';

/**
 * Get active items for dropdown selection
 */
export async function getActiveItemsForDropdown() {
  try {
    const result = await getActiveItems();
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to fetch items',
        items: [],
      };
    }

    return {
      success: true,
      items: result.items || [],
    };
  } catch (error) {
    console.error('Error fetching active items:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch items',
      items: [],
    };
  }
}

