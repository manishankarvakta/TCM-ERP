'use server';

import { getOrganizations } from '@/app/(dashboard)/dashboard/settings/_actions/organization.action';

/**
 * Get active organizations for dropdown selection
 */
export async function getActiveOrganizations() {
  try {
    const result = await getOrganizations(1, 100, '', 'active');
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to fetch organizations',
        organizations: [],
      };
    }

    return {
      success: true,
      organizations: result.organizations || [],
    };
  } catch (error) {
    console.error('Error fetching active organizations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch organizations',
      organizations: [],
    };
  }
}

