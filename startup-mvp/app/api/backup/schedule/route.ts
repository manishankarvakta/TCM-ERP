import { NextRequest, NextResponse } from 'next/server';
import { initializeBackupCron, getSchedulerStatus } from '@/lib/backup/scheduler';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await initializeBackupCron();
    const status = await getSchedulerStatus();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Backup scheduler updated.',
      status 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update backup scheduler' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getSchedulerStatus();
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch backup scheduler status' },
      { status: 500 }
    );
  }
}
