/**
 * Get the base path for a user based on their role
 * Client-side function that takes role as parameter
 * @param userRole - The user's role (case-insensitive)
 * @returns "/admin" for admin users, "/dashboard" for regular users
 */
export function getBasePathFromRole(userRole?: string | null): string {
  return "/dashboard";
}

/**
 * Get the base path from the current pathname
 * Client-side function that determines base path from URL
 * @param pathname - Current pathname (from usePathname hook)
 * @returns "/dashboard"
 */
export function getBasePathFromPathname(pathname: string): string {
  return "/dashboard";
}

/**
 * Get a full path with the correct base path based on user role
 * Client-side function
 * @param path - The path without base (e.g., "/items", "/settings")
 * @param userRole - The user's role (case-insensitive)
 * @returns Full path with base (e.g., "/admin/items", "/dashboard/items")
 */
export function getFullPathFromRole(path: string, userRole?: string | null): string {
  const basePath = getBasePathFromRole(userRole);
  // Remove leading slash from path if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${basePath}/${cleanPath}`;
}

