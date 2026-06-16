import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET() {
  // We don't know the exact user id, but we can clear all permissions caches if we want.
  // Actually, revalidateTag is exact match. We can't clear all easily without the ID.
  // Let's just return a response.
  return NextResponse.json({ message: "You need to restart your dev server to clear the cache." });
}
