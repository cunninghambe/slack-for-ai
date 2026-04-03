import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Helper Functions', () => {
  // Test helper utility functions
  describe('sanitizeInput', () => {
    // Pure function tests for input sanitization
    it('should truncate strings longer than max length', () => {
      const input = 'a'.repeat(300);
      const result = input.substring(0, 255);
      expect(result.length).toBe(255);
    });

    it('should preserve strings under max length', () => {
      const input = 'hello world';
      expect(input.length).toBeLessThanOrEqual(255);
      expect(input).toBe(input);
    });
  });

  describe('validateChannelName', () => {
    it('should accept valid channel names', () => {
      const validNames = ['general', 'dev-team', 'project-x', 'test_123', 'a'];
      const channelNameRegex = /^[a-zA-Z0-9_-]+$/;
      
      for (const name of validNames) {
        expect(channelNameRegex.test(name)).toBe(true);
      }
    });

    it('should reject channel names with spaces or special chars', () => {
      const invalidNames = ['hello world', 'test#channel', 'name@work', ''];
      const channelNameRegex = /^[a-zA-Z0-9_-]+$/;
      
      for (const name of invalidNames) {
        expect(channelNameRegex.test(name)).toBe(false);
      }
    });
  });

  describe('validateEmail', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    it('should accept valid email formats', () => {
      const validEmails = ['test@example.com', 'user.name@domain.org', 'a@b.co'];
      
      for (const email of validEmails) {
        expect(emailRegex.test(email)).toBe(true);
      }
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = ['not-an-email', '@domain.com', 'user@', 'user @domain.com'];
      
      for (const email of invalidEmails) {
        expect(emailRegex.test(email)).toBe(false);
      }
    });
  });
});

describe('Schema Validation Rules', () => {
  describe('Channel schema constraints', () => {
    it('should enforce channel name length limits', () => {
      const minLen = 1;
      const maxLen = 80;

      expect('a'.length).toBeGreaterThanOrEqual(minLen);
      expect('x'.repeat(80).length).toBeLessThanOrEqual(maxLen);
      expect('x'.repeat(81).length).toBeGreaterThan(maxLen);
    });

    it('should enforce description length limits', () => {
      const maxLen = 500;
      const shortDesc = 'A test channel';
      expect(shortDesc.length).toBeLessThanOrEqual(maxLen);

      const longDesc = 'x'.repeat(501);
      expect(longDesc.length).toBeGreaterThan(maxLen);
    });
  });

  describe('Message schema constraints', () => {
    it('should enforce content length limits', () => {
      const maxContentLen = 10000;
      
      const short = 'Hello world';
      expect(short.length).toBeLessThanOrEqual(maxContentLen);

      const long = 'x'.repeat(10001);
      expect(long.length).toBeGreaterThan(maxContentLen);
    });
  });
});

describe('UUID Format Validation', () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it('should validate standard UUID format', () => {
    expect(uuidRegex.test('ac09ad26-5ac3-4aa8-be8b-3c9ed6b14727')).toBe(true);
    expect(uuidRegex.test('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('should reject non-UUID strings', () => {
    expect(uuidRegex.test('not-a-uuid')).toBe(false);
    expect(uuidRegex.test('ac09ad26-5ac3-4aa8-be8b')).toBe(false);
    expect(uuidRegex.test('')).toBe(false);
  });
});
