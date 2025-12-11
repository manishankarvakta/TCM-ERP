'use server';

import { getOrganizations } from '@/app/(dashboard)/dashboard/settings/_actions/organization.action';

/**
 * Get active organizations for dropdown selection
 * Only returns organizations with status = "active"
 */
export async function getActiveOrganizations() {
  try {
    // Explicitly request only active organizations
    const result = await getOrganizations(1, 100, '', 'active');
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to fetch organizations',
        organizations: [],
      };
    }

    // Double-check: filter out any non-active organizations as a safety measure
    const activeOrganizations = (result.organizations || []).filter(
      (org) => org.status === 'active'
    );

    return {
      success: true,
      organizations: activeOrganizations,
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

