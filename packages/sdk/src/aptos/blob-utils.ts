/**
 * Utility functions for blob naming and hashing
 * These functions are designed to work in both browser and Node.js environments
 */

/**
 * Generate a unique blob name for Shelby storage
 * Format: movera/{schema_slug}/{timestamp}_{data_hash}
 * This ensures uniqueness while maintaining readability
 * 
 * @param schemaSlug - The schema name or slug
 * @param dataHash - The full data hash (hex string, with or without 0x prefix)
 * @returns The generated blob name
 */
export function generateBlobName(
  schemaSlug: string,
  dataHash: string,
): string {
  const timestamp = Date.now();
  // Remove 0x prefix if present
  const cleanHash = dataHash.startsWith('0x') ? dataHash.slice(2) : dataHash;
  const slug = schemaSlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `movera/${slug}/${timestamp}_${cleanHash}`;
}
