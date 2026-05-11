import { NextRequest, NextResponse } from 'next/server';
import { validateBackupIntegrity } from '@/lib/backup/validate';
import { getBackupTypeDir } from '@/lib/backup/config';
import path from 'path';
import { isBackupType } from '@/types/backup';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const type = searchParams.get('type');

  if (!id || !type || !isBackupType(type)) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing id or type. Use ?id=backup-YYYYMMDD-HHMMSS&type=database|files|full' 
    }, { status: 400 });
  }

  const filename = `${id}.zip`;
  const filePath = path.join(getBackupTypeDir(type as any), filename);

  try {
    const result = await validateBackupIntegrity(filePath);
    return NextResponse.json({
      success: true,
      filePath,
      result
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
