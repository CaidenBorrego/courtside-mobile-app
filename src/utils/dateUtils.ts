/**
 * Date and timestamp utility functions
 * 
 * Handles conversion between Firestore Timestamps, Date objects,
 * and serialized timestamp formats for consistent date handling
 * across the application.
 */

/**
 * Converts various timestamp formats to milliseconds since epoch
 * 
 * Handles:
 * - Firestore Timestamp objects (with toMillis method)
 * - Serialized timestamps (with seconds property)
 * - JavaScript Date objects
 * - Invalid/missing timestamps (returns 0)
 * 
 * @param date - The date/timestamp to convert
 * @returns Milliseconds since epoch, or 0 if invalid
 */
export function getTimestampMillis(date: any): number {
  if (!date) {
    return 0;
  }
  
  // Firestore Timestamp object
  if (typeof date.toMillis === 'function') {
    return date.toMillis();
  }
  
  // Serialized Firestore Timestamp (from cache or JSON)
  if (typeof date.seconds === 'number') {
    return date.seconds * 1000 + (date.nanoseconds || 0) / 1000000;
  }
  
  // JavaScript Date object
  if (date instanceof Date) {
    return date.getTime();
  }
  
  // String or number timestamp
  if (typeof date === 'string' || typeof date === 'number') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }
  
  return 0;
}

/**
 * Converts various timestamp formats to a JavaScript Date object
 * 
 * @param date - The date/timestamp to convert
 * @returns JavaScript Date object, or null if invalid
 */
export function toDate(date: any): Date | null {
  if (!date) {
    return null;
  }
  
  // Firestore Timestamp object
  if (typeof date.toDate === 'function') {
    return date.toDate();
  }
  
  // Serialized Firestore Timestamp
  if (typeof date.seconds === 'number') {
    return new Date(date.seconds * 1000);
  }
  
  // Already a Date object
  if (date instanceof Date) {
    return date;
  }
  
  // String or number timestamp
  if (typeof date === 'string' || typeof date === 'number') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  return null;
}

/**
 * Compares two timestamps for sorting
 * 
 * @param a - First timestamp
 * @param b - Second timestamp
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareTimestamps(a: any, b: any): number {
  return getTimestampMillis(a) - getTimestampMillis(b);
}

/**
 * Checks if a timestamp is valid
 * 
 * @param date - The date/timestamp to check
 * @returns True if the timestamp is valid and can be converted
 */
export function isValidTimestamp(date: any): boolean {
  return getTimestampMillis(date) > 0;
}
