/**
 * Generate a unique ID using crypto.randomUUID
 * Falls back to timestamp-based ID if crypto is not available (e.g., in older browsers)
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback: timestamp + random
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

