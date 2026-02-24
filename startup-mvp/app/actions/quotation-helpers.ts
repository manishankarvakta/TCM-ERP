'use server';

import { prisma } from '@/lib/prisma';
import { getSetting } from '@/app/(dashboard)/dashboard/settings/_actions/settings.action';
import { getCoverLetters } from '@/app/(dashboard)/dashboard/settings/_actions/coverLetter.action';
import { getCurrentUser } from '@/app/actions/user.action';
import { serializeData } from '@/lib/utils/serialization';

/**
 * Get TOS content from settings
 */
export async function getTOSContent() {
  try {
    const result = await getSetting('tos', 'quotation');
    
    if (result.success && result.setting) {
      const settings = result.setting.settings as { content?: string };
      return {
        success: true,
        content: settings?.content || null,
      };
    }
    
    return {
      success: true,
      content: null,
    };
  } catch (error) {
    console.error('Error fetching TOS:', error);
    return {
      success: false,
      content: null,
    };
  }
}

/**
 * Get active cover letters for dropdown
 */
export async function getActiveCoverLetters() {
  try {
    const result = await getCoverLetters(1, 100, '', 'active');
    
    if (result.success) {
      return serializeData({
        success: true,
        coverLetters: result.coverLetters || [],
      });
    }
    
    return {
      success: false,
      coverLetters: [],
    };
  } catch (error) {
    console.error('Error fetching cover letters:', error);
    return {
      success: false,
      coverLetters: [],
    };
  }
}

/**
 * Get current user for quotation
 */
export async function getQuotationUser() {
  try {
    const user = await getCurrentUser();
    return serializeData({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return {
      success: false,
      user: null,
    };
  }
}


/**
 * Get active users for dropdown (no admin check required for selection)
 */
export async function getQuotationUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return serializeData({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Error fetching users for quotation:', error);
    return {
      success: false,
      users: [],
    };
  }
}
