/**
 * Allowed file types and their MIME types
 */
export const ALLOWED_FILE_TYPES = {
  images: {
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/webp': ['.webp'],
    'image/gif': ['.gif'],
  },
  documents: {
    'application/pdf': ['.pdf'],
  },
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Check if a file type is allowed
 */
export function isFileTypeAllowed(file: File): boolean {
  const allAllowedTypes = [
    ...Object.keys(ALLOWED_FILE_TYPES.images),
    ...Object.keys(ALLOWED_FILE_TYPES.documents),
  ];
  
  return allAllowedTypes.includes(file.type);
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File | string): boolean {
  const mimeType = typeof file === 'string' ? file : file.type;
  return Object.keys(ALLOWED_FILE_TYPES.images).includes(mimeType);
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!isFileTypeAllowed(file)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: images (png, jpg, webp, gif) and PDF.`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of ${formatFileSize(MAX_FILE_SIZE)}.`,
    };
  }

  return { valid: true };
}

/**
 * Validate total size of files
 */
export function validateTotalSize(files: File[]): { valid: boolean; error?: string } {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      valid: false,
      error: `Total file size (${formatFileSize(totalSize)}) exceeds the maximum allowed size of ${formatFileSize(MAX_TOTAL_SIZE)}.`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get icon name for file type
 */
export function getFileIcon(contentType: string): string {
  if (isImageFile(contentType)) {
    return 'image';
  }
  
  if (contentType === 'application/pdf') {
    return 'file-text';
  }
  
  return 'file';
}

/**
 * Create thumbnail URL for image
 */
export function getThumbnailUrl(attachment: { url: string; contentType: string }): string | null {
  if (!isImageFile(attachment.contentType)) {
    return null;
  }
  
  // For now, return the original URL
  // In production, you might want to use a thumbnail service
  return attachment.url;
}

/**
 * Read file as data URL for preview
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
