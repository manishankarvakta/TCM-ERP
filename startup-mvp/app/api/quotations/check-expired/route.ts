'use server';

import { NextResponse } from 'next/server';
import { checkAndUpdateExpiredQuotations } from '@/app/actions/quotations';
import { auth } from '@/lib/auth';

/**
 * API route to check and update expired quotations
 * Can be called periodically via cron job or manually
 */
export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can trigger this manually
    // For cron jobs, you might want to use an API key instead
    if (session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const result = await checkAndUpdateExpiredQuotations();

    return NextResponse.json({
      success: true,
      updated: result.updated,
    });
  } catch (error) {
    console.error('Error checking expired quotations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for cron jobs (can use API key authentication)
 */
export async function GET(request: Request) {
  try {
    // Check for API key in headers (for cron jobs)
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.CRON_API_KEY;

    // If API key is set, require it; otherwise require admin auth
    if (expectedApiKey) {
      if (apiKey !== expectedApiKey) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      // Fallback to session auth
      const session = await auth();
      if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const result = await checkAndUpdateExpiredQuotations();

    return NextResponse.json({
      success: true,
      updated: result.updated,
    });
  } catch (error) {
    console.error('Error checking expired quotations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

