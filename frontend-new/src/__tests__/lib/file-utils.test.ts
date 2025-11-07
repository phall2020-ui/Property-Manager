import { describe, it, expect } from 'vitest';
import {
  validateFile,
  validateTotalSize,
  formatFileSize,
  isImageFile,
  isFileTypeAllowed,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
} from '../../lib/file-utils';

describe('file-utils', () => {
  describe('isFileTypeAllowed', () => {
    it('should allow PNG images', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      expect(isFileTypeAllowed(file)).toBe(true);
    });

    it('should allow JPEG images', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(isFileTypeAllowed(file)).toBe(true);
    });

    it('should allow WebP images', () => {
      const file = new File([''], 'test.webp', { type: 'image/webp' });
      expect(isFileTypeAllowed(file)).toBe(true);
    });

    it('should allow PDF documents', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' });
      expect(isFileTypeAllowed(file)).toBe(true);
    });

    it('should reject unsupported file types', () => {
      const file = new File([''], 'test.exe', { type: 'application/x-msdownload' });
      expect(isFileTypeAllowed(file)).toBe(false);
    });
  });

  describe('isImageFile', () => {
    it('should identify image files', () => {
      expect(isImageFile('image/png')).toBe(true);
      expect(isImageFile('image/jpeg')).toBe(true);
      expect(isImageFile('image/webp')).toBe(true);
      expect(isImageFile('image/gif')).toBe(true);
    });

    it('should identify non-image files', () => {
      expect(isImageFile('application/pdf')).toBe(false);
      expect(isImageFile('text/plain')).toBe(false);
    });

    it('should work with File objects', () => {
      const imageFile = new File([''], 'test.png', { type: 'image/png' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      
      expect(isImageFile(imageFile)).toBe(true);
      expect(isImageFile(pdfFile)).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should accept valid files', () => {
      const file = new File(['x'.repeat(1024)], 'test.png', { type: 'image/png' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files that are too large', () => {
      const largeContent = 'x'.repeat(MAX_FILE_SIZE + 1);
      const file = new File([largeContent], 'test.png', { type: 'image/png' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should reject unsupported file types', () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      const result = validateFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });
  });

  describe('validateTotalSize', () => {
    it('should accept files within total size limit', () => {
      const files = [
        new File(['x'.repeat(1024 * 1024)], 'test1.png', { type: 'image/png' }),
        new File(['x'.repeat(1024 * 1024)], 'test2.png', { type: 'image/png' }),
      ];
      const result = validateTotalSize(files);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files exceeding total size limit', () => {
      const largeContent = 'x'.repeat(MAX_TOTAL_SIZE / 2 + 1);
      const files = [
        new File([largeContent], 'test1.png', { type: 'image/png' }),
        new File([largeContent], 'test2.png', { type: 'image/png' }),
      ];
      const result = validateTotalSize(files);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Total file size');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });
});
