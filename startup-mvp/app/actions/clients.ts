'use server';

import { getClients } from '@/app/(dashboard)/dashboard/clients/_actions/client.action';

/**
 * Get active clients for dropdown selection
 */
export async function getActiveClients() {
  try {
    const result = await getClients(1, 100, '', 'active');
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to fetch clients',
        clients: [],
      };
    }

    return {
      success: true,
      clients: result.clients || [],
    };
  } catch (error) {
    console.error('Error fetching active clients:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clients',
      clients: [],
    };
  }
}

