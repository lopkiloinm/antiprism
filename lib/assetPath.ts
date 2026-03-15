/**
 * Utility function to resolve asset paths with base path support
 * This ensures SVGs and other static assets work correctly when deployed to subdirectories
 */

export function getAssetPath(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Get base path from Next.js config - this should match the basePath in next.config.ts
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  // Combine base path with asset path
  return basePath ? `/${basePath}/${cleanPath}` : `/${cleanPath}`;
}

/**
 * Get the current base path for use in asset URLs
 */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
}
