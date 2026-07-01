import { auth } from "@/lib/auth";
import { revalidatePath as nextRevalidatePath } from "next/cache";

/**
 * Get the base path for the current user based on their role
 * Server-side function that checks the session
 * @returns "/admin" for admin users, "/dashboard" for regular users
 */
export async function getBasePath(): Promise<string> {
  const session = await auth();
  const isAdmin = session?.user?.role?.toLowerCase() === "admin";
  return isAdmin ? "/admin" : "/dashboard";
}

/**
 * Get a full path with the correct base path for the current user
 * Server-side function
 * @param path - The path without base (e.g., "/items", "/settings")
 * @returns Full path with base (e.g., "/admin/items", "/dashboard/items")
 */
export async function getFullPath(path: string): Promise<string> {
  const basePath = await getBasePath();
  // Remove leading slash from path if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${basePath}/${cleanPath}`;
}

/**
 * Revalidate both admin and dashboard paths
 * This ensures cache is updated for both admin and regular users
 * @param path - The path to revalidate without base (e.g., "/items", "/settings", "items/123")
 * @param type - Optional revalidation type ("page" or "layout")
 */
export function revalidateBothPaths(path: string, type?: "page" | "layout"): void {
  // Remove leading slash from path if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  
  try {
    // Revalidate admin path
    nextRevalidatePath(`/dashboard/${cleanPath}`, type);
    
    // Revalidate dashboard path
    nextRevalidatePath(`/dashboard/${cleanPath}`, type);
  } catch (_) {
    // Ignore static generation store missing error during CLI/test script runs
  }
}

