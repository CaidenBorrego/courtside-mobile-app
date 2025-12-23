import { Timestamp } from 'firebase/firestore';
import {
  getTimestampMillis,
  toDate,
  compareTimestamps,
  isValidTimestamp,
} from '../dateUtils';

describe('dateUtils', () => {
  const testDate = new Date('2024-01-15T12:00:00Z');
  const testMillis = testDate.getTime();
  const testSeconds = Math.floor(testMillis / 1000);

  describe('getTimestampMillis', () => {
    it('should handle Firestore Timestamp objects', () => {
      const timestamp = Timestamp.fromDate(testDate);
      expect(getTimestampMillis(timestamp)).toBe(testMillis);
    });

    it('should handle serialized timestamps with seconds', () => {
      const serialized = { seconds: testSeconds, nanoseconds: 0 };
      expect(getTimestampMillis(serialized)).toBe(testSeconds * 1000);
    });

    it('should handle Date objects', () => {
      expect(getTimestampMillis(testDate)).toBe(testMillis);
    });

    it('should handle string timestamps', () => {
      const result = getTimestampMillis('2024-01-15T12:00:00Z');
      expect(result).toBe(testMillis);
    });

    it('should handle number timestamps', () => {
      expect(getTimestampMillis(testMillis)).toBe(testMillis);
    });

    it('should return 0 for null/undefined', () => {
      expect(getTimestampMillis(null)).toBe(0);
      expect(getTimestampMillis(undefined)).toBe(0);
    });

    it('should return 0 for invalid timestamps', () => {
      expect(getTimestampMillis('invalid')).toBe(0);
      expect(getTimestampMillis({})).toBe(0);
    });
  });

  describe('toDate', () => {
    it('should convert Firestore Timestamp to Date', () => {
      const timestamp = Timestamp.fromDate(testDate);
      const result = toDate(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(testMillis);
    });

    it('should convert serialized timestamp to Date', () => {
      const serialized = { seconds: testSeconds, nanoseconds: 0 };
      const result = toDate(serialized);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(testSeconds * 1000);
    });

    it('should return Date object as-is', () => {
      const result = toDate(testDate);
      expect(result).toBe(testDate);
    });

    it('should return null for invalid input', () => {
      expect(toDate(null)).toBeNull();
      expect(toDate(undefined)).toBeNull();
      expect(toDate('invalid')).toBeNull();
    });
  });

  describe('compareTimestamps', () => {
    const date1 = new Date('2024-01-15T12:00:00Z');
    const date2 = new Date('2024-01-16T12:00:00Z');

    it('should return negative when first is earlier', () => {
      expect(compareTimestamps(date1, date2)).toBeLessThan(0);
    });

    it('should return positive when first is later', () => {
      expect(compareTimestamps(date2, date1)).toBeGreaterThan(0);
    });

    it('should return 0 when equal', () => {
      expect(compareTimestamps(date1, date1)).toBe(0);
    });

    it('should handle mixed timestamp formats', () => {
      const timestamp1 = Timestamp.fromDate(date1);
      const serialized2 = { seconds: Math.floor(date2.getTime() / 1000), nanoseconds: 0 };
      expect(compareTimestamps(timestamp1, serialized2)).toBeLessThan(0);
    });
  });

  describe('isValidTimestamp', () => {
    it('should return true for valid timestamps', () => {
      expect(isValidTimestamp(testDate)).toBe(true);
      expect(isValidTimestamp(Timestamp.fromDate(testDate))).toBe(true);
      expect(isValidTimestamp({ seconds: testSeconds, nanoseconds: 0 })).toBe(true);
    });

    it('should return false for invalid timestamps', () => {
      expect(isValidTimestamp(null)).toBe(false);
      expect(isValidTimestamp(undefined)).toBe(false);
      expect(isValidTimestamp('invalid')).toBe(false);
      expect(isValidTimestamp({})).toBe(false);
    });
  });
});
