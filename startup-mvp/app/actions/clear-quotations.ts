'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * Clear all quotations from the database
 * WARNING: This is a destructive operation that cannot be undone
 */
export async function clearAllQuotations() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Delete all quotations (cascade will handle sections, groups, items)
    const result = await prisma.quotation.deleteMany({});

    return {
      success: true,
      message: `Successfully deleted ${result.count} quotation(s)`,
      count: result.count,
    };
  } catch (error) {
    console.error('Error clearing quotations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear quotations',
    };
  }
}

