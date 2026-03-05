'use server';

import { prisma } from '@/lib/prisma';
import { getCoverLetters } from '@/app/(dashboard)/dashboard/settings/_actions/coverLetter.action';
import { getCurrentUser } from '@/app/actions/user.action';
import { serializeData } from '@/lib/utils/serialization';
import { auth } from "@/lib/auth";
import { DEFAULT_TOS, DEFAULT_PAYMENT_TERMS, DEFAULT_REFUND_POLICY, DEFAULT_TERMINATION_POLICY } from "@/lib/quotation/templates";

/**
 * Fetches Quotation-related settings (TOS, Payment Terms, etc.)
 */
export async function getQuotationSettings() {
  try {
    const session = await auth();
    if (!session?.user) return { 
      success: true, 
      tos: DEFAULT_TOS, 
      paymentTerms: DEFAULT_PAYMENT_TERMS,
      refundPolicy: DEFAULT_REFUND_POLICY,
      terminationPolicy: DEFAULT_TERMINATION_POLICY 
    };

    const tosSetting = await prisma.settings.findFirst({
      where: {
        code: "tos",
        category: "quotation",
        is_active: true,
        OR: [{ user_id: session.user.id }, { is_global: true }],
      },
    });

    const settings = (tosSetting?.settings as any) || {};

    return {
      success: true,
      tos: settings.content || DEFAULT_TOS,
      paymentTerms: settings.paymentTerms || DEFAULT_PAYMENT_TERMS,
      refundPolicy: settings.refundPolicy || DEFAULT_REFUND_POLICY,
      terminationPolicy: settings.terminationPolicy || DEFAULT_TERMINATION_POLICY,
    };
  } catch (error) {
    console.error("Error fetching quotation settings:", error);
    return { 
      success: false, 
      tos: DEFAULT_TOS, 
      paymentTerms: DEFAULT_PAYMENT_TERMS,
      refundPolicy: DEFAULT_REFUND_POLICY,
      terminationPolicy: DEFAULT_TERMINATION_POLICY 
    };
  }
}

/**
 * Legacy wrapper for getTOSContent
 */
export async function getTOSContent() {
  const result = await getQuotationSettings();
  return {
    success: result.success,
    content: result.tos
  };
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
