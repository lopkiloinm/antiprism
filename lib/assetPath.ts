/**
 * Utility function to resolve asset paths with base path support
 * This ensures SVGs and other static assets work correctly when deployed to subdirectories
 */

export function getAssetPath(path: string): string {
  // Ensure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Get base path from Next.js config
  let basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  // Ensure basePath starts with a slash if it's not empty
  if (basePath && !basePath.startsWith('/')) {
    basePath = `/${basePath}`;
  }
  
  // Remove trailing slash from basePath if present to avoid double slashes
  if (basePath.endsWith('/')) {
    basePath = basePath.slice(0, -1);
  }
  
  // Combine base path with asset path
  return `${basePath}${normalizedPath}`;
}

/**
 * Get the current base path for use in asset URLs
 */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
}
